# Database Directory

This directory contains database-related files for the EazzyMart backend.

## Files

### `postgres-schema.sql`
PostgreSQL schema definition for all tables. This file:
- Defines all database tables with proper data types
- Creates indexes for optimal performance
- Includes foreign key relationships
- Adds comments for documentation

### `migrate-to-postgres.js`
Migration script to transfer data from SQLite to PostgreSQL. Features:
- Connects to both SQLite and PostgreSQL databases
- Creates PostgreSQL schema
- Migrates data table by table (respecting foreign key dependencies)
- Handles data type conversions (booleans, timestamps, etc.)
- Verifies migration success by comparing row counts
- Resets sequence generators for SERIAL columns

## Usage

### Running the Migration

```bash
# Make sure you have set up your .env file first
node database/migrate-to-postgres.js
```

### Creating Schema Only (without data migration)

```bash
# Connect to your PostgreSQL database and run:
psql -h your_host -U your_user -d your_database -f database/postgres-schema.sql
```

## Migration Order

Tables are migrated in this order to respect foreign key dependencies:

1. `items` - Product catalog (no dependencies)
2. `stock_entries` - References items
3. `users` - User accounts (no dependencies)
4. `tax_reports` - Tax reports (no dependencies)
5. `orders` - Order headers (references users)
6. `order_items` - Order details (references orders and items)
7. `sales` - Legacy sales table (backward compatibility)
8. `salesorder` - Legacy sales items (backward compatibility)
9. `return_refund_requests` - Return/refund requests (references orders and users)

## Data Type Conversions

### SQLite → PostgreSQL

| SQLite Type | PostgreSQL Type | Notes |
|------------|----------------|-------|
| INTEGER AUTOINCREMENT | SERIAL | Auto-incrementing primary keys |
| REAL | NUMERIC(10, 2) | Precise decimal numbers for prices |
| TEXT | TEXT | Text strings |
| DATETIME | TIMESTAMP | Date and time values |
| BOOLEAN (0/1) | BOOLEAN | Converted from 0/1 to false/true |

## Indexes

The following indexes are created for performance:

- `idx_stock_entries_item_id` - Stock entries by product
- `idx_stock_entries_date_added` - Stock entries by date
- `idx_users_username` - User lookup by username
- `idx_sales_order_id` - Sales by order ID
- `idx_sales_status` - Sales by status
- `idx_orders_user_id` - Orders by user
- `idx_orders_status` - Orders by status
- `idx_orders_order_date` - Orders by date
- `idx_order_items_order_id` - Order items by order
- `idx_order_items_product_id` - Order items by product
- `idx_return_refund_order_id` - Return/refund by order
- `idx_return_refund_user_id` - Return/refund by user
- `idx_return_refund_status` - Return/refund by status

## Backup

Before running any migration:
1. Backup your SQLite database to `archive/sqlite-backup-YYYYMMDD/`
2. Test the migration on a development database first
3. Verify all data after migration

## Troubleshooting

### Migration fails with "column does not exist"
- Check that the PostgreSQL schema was created successfully
- Verify table names match exactly (case-sensitive in PostgreSQL)

### Data type mismatch errors
- Review the data type conversions above
- Check for any custom data in SQLite that needs special handling

### Foreign key constraint violations
- Ensure tables are migrated in the correct order
- Verify referential integrity in the source SQLite database

### Sequence not found errors
- Some tables don't have sequences (like `orders` with TEXT primary key)
- The script handles this automatically, but you may see warnings

## Maintenance

### Resetting Sequences After Manual Data Import

If you manually import data and IDs are out of sync:

```sql
-- For each table with a SERIAL column
SELECT setval('table_name_id_seq', (SELECT MAX(id) FROM table_name));
```

### Checking Migration Status

```sql
-- Compare row counts
SELECT 'items' as table, COUNT(*) as count FROM items
UNION ALL
SELECT 'users' as table, COUNT(*) as count FROM users
UNION ALL
SELECT 'orders' as table, COUNT(*) as count FROM orders
-- Add more tables as needed
ORDER BY table;
```

## Additional Resources

- [PostgreSQL Data Types](https://www.postgresql.org/docs/current/datatype.html)
- [PostgreSQL Indexes](https://www.postgresql.org/docs/current/indexes.html)
- [Neon Documentation](https://neon.tech/docs)

