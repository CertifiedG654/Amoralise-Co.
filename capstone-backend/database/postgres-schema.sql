-- PostgreSQL Schema for EazzyMart Backend
-- Migration from SQLite to PostgreSQL

-- Drop tables if they exist (for clean migration)
DROP TABLE IF EXISTS return_refund_requests CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS salesorder CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS tax_reports CASCADE;
DROP TABLE IF EXISTS stock_entries CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Items table (products catalog)
CREATE TABLE items (
    id SERIAL PRIMARY KEY,
    names TEXT,
    price NUMERIC(10, 2),
    stock INTEGER,
    category TEXT,
    descs TEXT,
    images TEXT
);

-- Stock entries table (inventory tracking)
CREATE TABLE stock_entries (
    id SERIAL PRIMARY KEY,
    item_id INTEGER REFERENCES items(id),
    quantity_added INTEGER,
    date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table (authentication and user management)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'customer',
    firstname TEXT,
    lastname TEXT,
    gender TEXT,
    birthDate TIMESTAMP,
    isVerified INTEGER NOT NULL DEFAULT 0 CHECK (isVerified IN (0, 1))
);

-- Tax reports table
CREATE TABLE tax_reports (
    id SERIAL PRIMARY KEY,
    report_content TEXT
);

-- Legacy sales table (for backward compatibility)
CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    order_id TEXT UNIQUE,
    customer TEXT,
    address TEXT,
    payment TEXT,
    status TEXT DEFAULT 'Pending',
    total INTEGER,
    type TEXT,
    delivery TEXT,
    reason TEXT,
    trnumber TEXT,
    createddate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    out_for_delivery_date TIMESTAMP,
    isDelivered BOOLEAN DEFAULT FALSE,
    contact TEXT,
    createdbyuser TEXT
);

-- Normalized orders table (order header)
CREATE TABLE orders (
    order_id TEXT PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    total_amount NUMERIC(10, 2) NOT NULL,
    order_status TEXT NOT NULL DEFAULT 'Pending',
    payment_method TEXT,
    shipping_address TEXT,
    order_type TEXT,
    contact_number TEXT,
    transaction_number TEXT,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    out_for_delivery_date TIMESTAMP,
    estimated_delivery_datetime TIMESTAMP
);

-- Normalized order_items table (order details)
CREATE TABLE order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price NUMERIC(10, 2) NOT NULL,
    total NUMERIC(10, 2) NOT NULL
);

-- Legacy salesorder table (for backward compatibility)
CREATE TABLE salesorder (
    id SERIAL PRIMARY KEY,
    salesid INTEGER,
    name TEXT,
    price INTEGER,
    qty INTEGER
);

-- Return and refund requests table
CREATE TABLE return_refund_requests (
    id SERIAL PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    image_path TEXT,
    status TEXT NOT NULL DEFAULT 'Pending',
    request_type TEXT NOT NULL DEFAULT 'Return',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    admin_notes TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stock_entries_item_id ON stock_entries(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_entries_date_added ON stock_entries(date_added);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_sales_order_id ON sales(order_id);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_return_refund_order_id ON return_refund_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_return_refund_user_id ON return_refund_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_return_refund_status ON return_refund_requests(status);

-- Comments for documentation
COMMENT ON TABLE items IS 'Product catalog with inventory levels';
COMMENT ON TABLE stock_entries IS 'Tracking of stock additions';
COMMENT ON TABLE users IS 'User accounts for customers, cashiers, and admins';
COMMENT ON TABLE orders IS 'Normalized order headers';
COMMENT ON TABLE order_items IS 'Normalized order line items';
COMMENT ON TABLE sales IS 'Legacy sales table for backward compatibility';
COMMENT ON TABLE salesorder IS 'Legacy sales items for backward compatibility';
COMMENT ON TABLE return_refund_requests IS 'Customer return and refund requests';

