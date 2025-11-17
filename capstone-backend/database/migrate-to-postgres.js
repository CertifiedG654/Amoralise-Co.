#!/usr/bin/env node

/**
 * SQLite to PostgreSQL Migration Script
 * Migrates data from local SQLite database to Neon PostgreSQL
 */

require('dotenv').config();
const { Pool } = require('pg');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

// Configuration
const SQLITE_DB_PATH = path.join(__dirname, '..', 'grocery.db');
const SCHEMA_PATH = path.join(__dirname, 'postgres-schema.sql');

// Table migration order (respects foreign key dependencies)
const TABLES = [
  'items',
  'stock_entries',
  'users',
  'tax_reports',
  'orders',
  'order_items',
  'sales',
  'salesorder',
  'return_refund_requests'
];

let sqliteDb;
let pgPool;

/**
 * Connect to SQLite database
 */
async function connectSQLite() {
  console.log('🔄 Connecting to SQLite database...');
  sqliteDb = await open({
    filename: SQLITE_DB_PATH,
    driver: sqlite3.Database
  });
  console.log('✅ Connected to SQLite');
}

/**
 * Connect to PostgreSQL database
 */
async function connectPostgreSQL() {
  console.log('🔄 Connecting to PostgreSQL database...');
  
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  });
  
  // Test connection
  const client = await pgPool.connect();
  const result = await client.query('SELECT version()');
  console.log('✅ Connected to PostgreSQL:', result.rows[0].version);
  client.release();
}

/**
 * Create PostgreSQL schema
 */
async function createSchema() {
  console.log('🔄 Creating PostgreSQL schema...');
  
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  await pgPool.query(schema);
  
  console.log('✅ Schema created successfully');
}

/**
 * Migrate data for a single table
 */
async function migrateTable(tableName) {
  console.log(`🔄 Migrating table: ${tableName}...`);
  
  // Check if table exists in SQLite
  const tableExists = await sqliteDb.get(
    `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
    [tableName]
  );
  
  if (!tableExists) {
    console.log(`⚠️  Table ${tableName} does not exist in SQLite, skipping...`);
    return { migrated: 0 };
  }
  
  // Get all rows from SQLite
  const rows = await sqliteDb.all(`SELECT * FROM ${tableName}`);
  
  if (rows.length === 0) {
    console.log(`   ℹ️  Table ${tableName} is empty`);
    return { migrated: 0 };
  }
  
  // Get column names from first row
  const columns = Object.keys(rows[0]);
  
  // Filter out auto-increment ID columns for PostgreSQL
  const insertColumns = columns.filter(col => {
    // For PostgreSQL, we don't want to insert into SERIAL columns
    // unless the table is part of a specific list
    const includeIdTables = ['orders', 'sales']; // These tables have non-serial IDs
    return col !== 'id' || includeIdTables.includes(tableName);
  });
  
  let migratedCount = 0;
  
  // Insert rows one by one (safer for data type conversions)
  for (const row of rows) {
    const values = insertColumns.map(col => {
      const value = row[col];
      
      // Handle boolean conversions (SQLite uses 0/1, PostgreSQL uses true/false)
      if (tableName === 'users' && col === 'isVerified') {
        return value === 1;
      }
      if (tableName === 'sales' && col === 'isDelivered') {
        return value === 1;
      }
      
      // Handle NULL values
      if (value === null || value === undefined) {
        return null;
      }
      
      return value;
    });
    
    const placeholders = insertColumns.map((_, i) => `$${i + 1}`).join(', ');
    const columnNames = insertColumns.join(', ');
    
    try {
      await pgPool.query(
        `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders})`,
        values
      );
      migratedCount++;
    } catch (err) {
      console.error(`❌ Error inserting row into ${tableName}:`, err.message);
      console.error('   Row data:', row);
      throw err;
    }
  }
  
  console.log(`✅ Migrated ${migratedCount} rows to ${tableName}`);
  
  // Reset sequences for SERIAL columns
  if (!['orders', 'sales'].includes(tableName)) {
    try {
      await pgPool.query(`SELECT setval('${tableName}_id_seq', (SELECT MAX(id) FROM ${tableName}), true)`);
      console.log(`   ✅ Reset sequence for ${tableName}`);
    } catch (err) {
      // Sequence might not exist or table might be empty
      console.log(`   ℹ️  Could not reset sequence for ${tableName} (this is OK if table is empty)`);
    }
  }
  
  return { migrated: migratedCount };
}

/**
 * Verify migration
 */
async function verifyMigration() {
  console.log('\n🔄 Verifying migration...\n');
  
  for (const tableName of TABLES) {
    try {
      const sqliteCount = await sqliteDb.get(`SELECT COUNT(*) as count FROM ${tableName}`);
      const pgCount = await pgPool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      
      const sqliteTotal = sqliteCount?.count || 0;
      const pgTotal = parseInt(pgCount.rows[0]?.count || 0);
      
      const status = sqliteTotal === pgTotal ? '✅' : '⚠️';
      console.log(`${status} ${tableName}: SQLite=${sqliteTotal}, PostgreSQL=${pgTotal}`);
      
      if (sqliteTotal !== pgTotal) {
        console.warn(`   ⚠️  Row count mismatch detected!`);
      }
    } catch (err) {
      console.log(`⚠️  ${tableName}: Could not verify (table might not exist)`);
    }
  }
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║  SQLite to PostgreSQL Migration Script    ║');
  console.log('║  EazzyMart Backend                         ║');
  console.log('╚════════════════════════════════════════════╝\n');
  
  try {
    // Step 1: Connect to databases
    await connectSQLite();
    await connectPostgreSQL();
    
    // Step 2: Create schema
    await createSchema();
    
    // Step 3: Migrate data
    console.log('\n🔄 Starting data migration...\n');
    const stats = {};
    
    for (const tableName of TABLES) {
      const result = await migrateTable(tableName);
      stats[tableName] = result.migrated;
    }
    
    // Step 4: Verify migration
    await verifyMigration();
    
    // Step 5: Summary
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║  Migration Summary                         ║');
    console.log('╚════════════════════════════════════════════╝\n');
    
    const totalRows = Object.values(stats).reduce((sum, count) => sum + count, 0);
    console.log(`Total rows migrated: ${totalRows}`);
    console.log('\nRows per table:');
    Object.entries(stats).forEach(([table, count]) => {
      console.log(`  • ${table}: ${count} rows`);
    });
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Update your .env file: DB_TYPE=postgres');
    console.log('   2. Backup your SQLite database');
    console.log('   3. Restart your server: npm start');
    console.log('   4. Test your application');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    // Close connections
    if (sqliteDb) {
      await sqliteDb.close();
      console.log('\n🔌 Closed SQLite connection');
    }
    if (pgPool) {
      await pgPool.end();
      console.log('🔌 Closed PostgreSQL connection');
    }
  }
}

// Run migration
if (require.main === module) {
  migrate().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { migrate };

