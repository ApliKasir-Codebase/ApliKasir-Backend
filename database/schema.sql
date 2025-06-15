-- ============================================
-- ApliKasir Database Schema - Development
-- Updated to match production structure
-- ============================================

-- Create database
CREATE DATABASE IF NOT EXISTS aplikasir_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE aplikasir_db;

-- ============================================
-- Table: users
-- ============================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phoneNumber VARCHAR(20) UNIQUE NOT NULL,
    storeName VARCHAR(255) NOT NULL,
    storeAddress TEXT NOT NULL,
    passwordHash VARCHAR(255) NOT NULL,
    profileImagePath VARCHAR(500),
    kodeQR VARCHAR(191) DEFAULT NULL COMMENT 'QRIS code for mobile payment',
    last_sync_time DATETIME,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    email_verified_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_phone (phoneNumber),
    INDEX idx_last_sync (last_sync_time),
    INDEX idx_active (is_active)
);

-- ============================================
-- Table: products
-- ============================================
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    kode_produk VARCHAR(100),
    nama_produk VARCHAR(255) NOT NULL,
    kategori VARCHAR(255) DEFAULT NULL,
    merek VARCHAR(255) DEFAULT NULL,
    deskripsi TEXT DEFAULT NULL,
    jumlah_produk INT DEFAULT 0,
    harga_modal DECIMAL(15,2) DEFAULT 0,
    harga_jual DECIMAL(15,2) DEFAULT 0,
    gambar_produk VARCHAR(500),
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_products (user_id),
    INDEX idx_product_code (kode_produk),
    INDEX idx_product_active (is_active),
    INDEX idx_updated_at (updated_at),
    INDEX idx_deleted_at (deleted_at),
    INDEX idx_user_updated (user_id, updated_at)
);

-- ============================================
-- Table: customers
-- ============================================
CREATE TABLE customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    nama_pelanggan VARCHAR(255) NOT NULL,
    nomor_telepon VARCHAR(20),
    alamat TEXT DEFAULT NULL,
    email VARCHAR(191) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_customers (user_id),
    INDEX idx_customer_phone (nomor_telepon),
    INDEX idx_customer_email (email),
    INDEX idx_updated_at (updated_at),
    INDEX idx_deleted_at (deleted_at),
    INDEX idx_user_updated (user_id, updated_at)
);

-- ============================================
-- Table: transactions
-- ============================================
CREATE TABLE transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    id_pelanggan INT DEFAULT NULL,
    tanggal_transaksi DATETIME NOT NULL,
    total_belanja DECIMAL(15,2) NOT NULL,
    total_modal DECIMAL(15,2) DEFAULT 0,
    metode_pembayaran ENUM('cash', 'debit', 'credit', 'qris', 'transfer') DEFAULT 'cash',
    status_pembayaran ENUM('pending', 'paid', 'cancelled', 'refunded') DEFAULT 'pending',
    detail_items JSON,
    jumlah_bayar DECIMAL(15,2) DEFAULT 0,
    jumlah_kembali DECIMAL(15,2) DEFAULT 0,
    catatan TEXT DEFAULT NULL,
    id_transaksi_hutang INT,
    discount_amount DECIMAL(15,2) DEFAULT 0.00,
    tax_amount DECIMAL(15,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (id_pelanggan) REFERENCES customers(id) ON DELETE SET NULL,
    INDEX idx_user_transactions (user_id),
    INDEX idx_customer_id (id_pelanggan),
    INDEX idx_transaction_date (tanggal_transaksi),
    INDEX idx_payment_method (metode_pembayaran),
    INDEX idx_payment_status (status_pembayaran),
    INDEX idx_updated_at (updated_at),
    INDEX idx_deleted_at (deleted_at),
    INDEX idx_user_date (user_id, tanggal_transaksi),
    INDEX idx_user_updated (user_id, updated_at)
);

-- ============================================
-- Table: sync_logs
-- ============================================
CREATE TABLE sync_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    sync_start_time DATETIME NOT NULL,
    sync_end_time DATETIME,
    direction ENUM('Upload Only', 'Download Only', 'Bidirectional') NOT NULL DEFAULT 'Bidirectional',
    status ENUM('In Progress', 'Success', 'Partial Success', 'Failed') NOT NULL,
    items_uploaded INT DEFAULT 0,
    items_downloaded INT DEFAULT 0,
    client_last_sync_time DATETIME,
    server_sync_time DATETIME,
    error_message TEXT,
    details JSON,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent VARCHAR(500) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_sync_logs (user_id),
    INDEX idx_sync_status (status),
    INDEX idx_sync_direction (direction),
    INDEX idx_sync_start_time (sync_start_time),
    INDEX idx_user_status (user_id, status)
);

-- ============================================
-- Insert sample data (Optional - for testing)
-- ============================================

-- Sample user (password: "password123" - hashed)
INSERT INTO users (name, email, phoneNumber, storeName, storeAddress, passwordHash) VALUES 
('Admin User', 'admin@aplikasir.com', '081234567890', 'Toko Demo', 'Jl. Contoh No. 123, Jakarta', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

-- Get the user ID for foreign key references
SET @user_id = LAST_INSERT_ID();

-- Sample products
INSERT INTO products (user_id, nama_produk, kode_produk, jumlah_produk, harga_modal, harga_jual) VALUES 
(@user_id, 'Indomie Goreng', 'IDM001', 50, 2500.00, 3000.00),
(@user_id, 'Aqua 600ml', 'AQA600', 30, 1500.00, 2000.00),
(@user_id, 'Teh Botol Sosro', 'TBS330', 25, 3000.00, 4000.00);

-- Sample customers
INSERT INTO customers (user_id, nama_pelanggan, nomor_telepon) VALUES 
(@user_id, 'Pelanggan Reguler', '081987654321'),
(@user_id, 'Ahmad Suryadi', '081234567891');

-- Sample transaction
INSERT INTO transactions (user_id, tanggal_transaksi, total_belanja, total_modal, metode_pembayaran, status_pembayaran, detail_items, jumlah_bayar, jumlah_kembali) VALUES 
(@user_id, NOW(), 15000.00, 12500.00, 'cash', 'paid', '[{"product_id":1,"quantity":5,"price":3000}]', 15000.00, 0.00);

-- ============================================
-- Indexes for performance optimization
-- ============================================

-- Additional composite indexes for common queries
CREATE INDEX idx_products_user_updated ON products(user_id, updated_at);
CREATE INDEX idx_customers_user_updated ON customers(user_id, updated_at);
CREATE INDEX idx_transactions_user_date ON transactions(user_id, tanggal_transaksi);
CREATE INDEX idx_sync_logs_user_status ON sync_logs(user_id, status);

-- ============================================
-- Views for common queries (Optional)
-- ============================================

-- Active products view (not deleted)
CREATE VIEW active_products AS
SELECT id, user_id, kode_produk, nama_produk, kategori, merek, deskripsi, jumlah_produk, harga_modal, harga_jual, gambar_produk, is_active, created_at, updated_at, deleted_at FROM products 
WHERE deleted_at IS NULL;

-- Active customers view (not deleted)
CREATE VIEW active_customers AS
SELECT id, user_id, nama_pelanggan, nomor_telepon, alamat, email, created_at, updated_at, deleted_at FROM customers 
WHERE deleted_at IS NULL;

-- Active transactions view (not deleted)
CREATE VIEW active_transactions AS
SELECT id, user_id, id_pelanggan, tanggal_transaksi, total_belanja, total_modal, metode_pembayaran, status_pembayaran, detail_items, jumlah_bayar, jumlah_kembali, catatan, id_transaksi_hutang, discount_amount, tax_amount, created_at, updated_at, deleted_at FROM transactions 
WHERE deleted_at IS NULL;

-- Recent sync logs view
CREATE VIEW recent_sync_logs AS
SELECT id, user_id, sync_start_time, sync_end_time, direction, status, items_uploaded, items_downloaded, client_last_sync_time, server_sync_time, error_message, details, ip_address, user_agent, created_at FROM sync_logs 
WHERE sync_start_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)
ORDER BY sync_start_time DESC;

-- ============================================
-- Stored procedures for maintenance (Optional)
-- ============================================

DELIMITER //

-- Procedure to clean old sync logs (older than 90 days)
CREATE PROCEDURE CleanOldSyncLogs()
BEGIN
    DELETE FROM sync_logs 
    WHERE sync_start_time < DATE_SUB(NOW(), INTERVAL 90 DAY);
    
    SELECT ROW_COUNT() as deleted_logs;
END //

-- Procedure to get user sync statistics
CREATE PROCEDURE GetUserSyncStats(IN user_id INT)
BEGIN
    SELECT 
        COUNT(*) as total_syncs,
        SUM(CASE WHEN status = 'Success' THEN 1 ELSE 0 END) as successful_syncs,
        SUM(CASE WHEN status = 'Failed' THEN 1 ELSE 0 END) as failed_syncs,
        AVG(items_uploaded) as avg_items_uploaded,
        AVG(items_downloaded) as avg_items_downloaded,
        MAX(sync_start_time) as last_sync_time
    FROM sync_logs 
    WHERE sync_logs.user_id = user_id
    AND sync_start_time >= DATE_SUB(NOW(), INTERVAL 30 DAY);
END //

DELIMITER ;

-- ============================================
-- Database setup complete
-- ============================================

SHOW TABLES;
SELECT 'Database setup completed successfully!' as message;
