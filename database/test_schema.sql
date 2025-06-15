-- ============================================
-- ApliKasir Backend - Test Database Schema for CI/CD
-- Optimized for GitHub Actions testing
-- ============================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";
SET NAMES utf8mb4;
SET foreign_key_checks = 0;

-- Create test database
CREATE DATABASE IF NOT EXISTS `aplikasir_test_db` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `aplikasir_test_db`;

-- ============================================
-- Core Tables for Backend API Testing
-- ============================================

-- Users table (Main backend users - toko owners)
CREATE TABLE `users` (
  `id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `phoneNumber` VARCHAR(50) NOT NULL,
  `storeName` VARCHAR(255) NOT NULL,
  `storeAddress` TEXT NOT NULL,
  `passwordHash` VARCHAR(255) NOT NULL,
  `profileImagePath` TEXT DEFAULT NULL,
  `kodeQR` VARCHAR(191) DEFAULT NULL,
  `last_sync_time` TIMESTAMP NULL DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `email_verified_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  UNIQUE KEY `users_phone_unique` (`phoneNumber`),
  KEY `idx_user_email` (`email`),
  KEY `idx_user_phone` (`phoneNumber`),
  KEY `idx_user_active` (`is_active`),
  KEY `idx_last_sync` (`last_sync_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Products table
CREATE TABLE `products` (
  `id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT(20) UNSIGNED NOT NULL,
  `kode_produk` VARCHAR(100) DEFAULT NULL,
  `nama_produk` VARCHAR(255) NOT NULL,
  `kategori` VARCHAR(255) DEFAULT NULL,
  `merek` VARCHAR(255) DEFAULT NULL,
  `deskripsi` TEXT DEFAULT NULL,
  `jumlah_produk` INT(11) NOT NULL DEFAULT 0,
  `harga_modal` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `harga_jual` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `gambar_produk` VARCHAR(500) DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_products` (`user_id`),
  KEY `idx_product_code` (`kode_produk`),
  KEY `idx_product_active` (`is_active`),
  KEY `idx_updated_at` (`updated_at`),
  KEY `idx_deleted_at` (`deleted_at`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Customers table
CREATE TABLE `customers` (
  `id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT(20) UNSIGNED NOT NULL,
  `nama_pelanggan` VARCHAR(255) NOT NULL,
  `nomor_telepon` VARCHAR(50) DEFAULT NULL,
  `alamat` TEXT DEFAULT NULL,
  `email` VARCHAR(191) DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_customers` (`user_id`),
  KEY `idx_customer_phone` (`nomor_telepon`),
  KEY `idx_updated_at` (`updated_at`),
  KEY `idx_deleted_at` (`deleted_at`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Transactions table
CREATE TABLE `transactions` (
  `id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT(20) UNSIGNED NOT NULL,
  `id_pelanggan` BIGINT(20) UNSIGNED DEFAULT NULL,
  `tanggal_transaksi` DATETIME NOT NULL,
  `total_belanja` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `total_modal` DECIMAL(15,2) DEFAULT 0.00,
  `metode_pembayaran` ENUM('cash', 'debit', 'credit', 'qris', 'transfer') DEFAULT 'cash',
  `status_pembayaran` ENUM('pending', 'paid', 'cancelled', 'refunded') DEFAULT 'pending',
  `detail_items` JSON DEFAULT NULL,
  `jumlah_bayar` DECIMAL(15,2) DEFAULT 0.00,
  `jumlah_kembali` DECIMAL(15,2) DEFAULT 0.00,
  `catatan` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_transactions` (`user_id`),
  KEY `idx_customer_id` (`id_pelanggan`),
  KEY `idx_transaction_date` (`tanggal_transaksi`),
  KEY `idx_payment_status` (`status_pembayaran`),
  KEY `idx_updated_at` (`updated_at`),
  KEY `idx_deleted_at` (`deleted_at`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`id_pelanggan`) REFERENCES `customers`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sync logs table
CREATE TABLE `sync_logs` (
  `id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT(20) UNSIGNED NOT NULL,
  `sync_start_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `sync_end_time` DATETIME DEFAULT NULL,
  `direction` ENUM('Upload Only', 'Download Only', 'Bidirectional') NOT NULL DEFAULT 'Bidirectional',
  `status` ENUM('In Progress', 'Success', 'Partial Success', 'Failed') NOT NULL DEFAULT 'In Progress',
  `items_uploaded` INT(11) NOT NULL DEFAULT 0,
  `items_downloaded` INT(11) NOT NULL DEFAULT 0,
  `client_last_sync_time` DATETIME DEFAULT NULL,
  `server_sync_time` DATETIME DEFAULT NULL,
  `error_message` TEXT DEFAULT NULL,
  `details` JSON DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_sync_logs` (`user_id`),
  KEY `idx_sync_status` (`status`),
  KEY `idx_sync_start_time` (`sync_start_time`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Test Data for CI/CD Pipeline
-- ============================================

-- Insert test users for API testing
INSERT INTO `users` (`id`, `name`, `email`, `phoneNumber`, `storeName`, `storeAddress`, `passwordHash`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'Test User 1', 'test@example.com', '081234567890', 'Test Store 1', 'Test Address 1', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1, NOW(), NOW()),
(2, 'Test User 2', 'test2@example.com', '081234567891', 'Test Store 2', 'Test Address 2', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1, NOW(), NOW()),
(3, 'John Doe', 'john.doe@example.com', '081234567892', 'Toko Berkah Jaya', 'Jl. Merdeka No. 123', '$2b$10$Fv6QJSwPD2lO1QxLn9a1Pe4qczuUyDGMr/v8akgTxNdHDTHrSJ.fW', 1, NOW(), NOW());

-- Insert test products
INSERT INTO `products` (`user_id`, `kode_produk`, `nama_produk`, `kategori`, `jumlah_produk`, `harga_modal`, `harga_jual`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'IDM001', 'Indomie Goreng', 'Makanan Instan', 50, 2500.00, 3000.00, 1, NOW(), NOW()),
(1, 'AQA600', 'Aqua 600ml', 'Minuman', 30, 1500.00, 2000.00, 1, NOW(), NOW()),
(1, 'TBS330', 'Teh Botol Sosro', 'Minuman', 25, 3000.00, 4000.00, 1, NOW(), NOW()),
(2, 'CC001', 'Coca Cola 330ml', 'Minuman', 40, 3500.00, 5000.00, 1, NOW(), NOW()),
(2, 'BB001', 'Beng Beng', 'Makanan Ringan', 60, 1200.00, 1500.00, 1, NOW(), NOW()),
(3, 'TEST001', 'Test Product', 'Test Category', 10, 1000.00, 1500.00, 1, NOW(), NOW());

-- Insert test customers
INSERT INTO `customers` (`user_id`, `nama_pelanggan`, `nomor_telepon`, `created_at`, `updated_at`) VALUES
(1, 'Pelanggan Test 1', '081987654321', NOW(), NOW()),
(1, 'Ahmad Suryadi', '081234567893', NOW(), NOW()),
(2, 'Pelanggan Test 2', '081987654322', NOW(), NOW()),
(3, 'John Customer', '081987654323', NOW(), NOW());

-- Insert test transactions
INSERT INTO `transactions` (`user_id`, `id_pelanggan`, `tanggal_transaksi`, `total_belanja`, `total_modal`, `metode_pembayaran`, `status_pembayaran`, `detail_items`, `jumlah_bayar`, `jumlah_kembali`, `created_at`, `updated_at`) VALUES
(1, 1, NOW(), 15000.00, 12500.00, 'cash', 'paid', '[{"product_id":1,"quantity":5,"price":3000}]', 15000.00, 0.00, NOW(), NOW()),
(1, NULL, NOW() - INTERVAL 1 DAY, 8000.00, 6000.00, 'qris', 'paid', '[{"product_id":2,"quantity":4,"price":2000}]', 8000.00, 0.00, NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 1 DAY),
(2, 3, NOW() - INTERVAL 2 HOUR, 5000.00, 3500.00, 'cash', 'paid', '[{"product_id":4,"quantity":1,"price":5000}]', 5000.00, 0.00, NOW() - INTERVAL 2 HOUR, NOW() - INTERVAL 2 HOUR),
(3, 4, NOW(), 1500.00, 1000.00, 'cash', 'paid', '[{"product_id":6,"quantity":1,"price":1500}]', 1500.00, 0.00, NOW(), NOW());

-- Insert test sync logs
INSERT INTO `sync_logs` (`user_id`, `sync_start_time`, `sync_end_time`, `direction`, `status`, `items_uploaded`, `items_downloaded`, `server_sync_time`, `created_at`) VALUES
(1, NOW() - INTERVAL 1 HOUR, NOW() - INTERVAL 1 HOUR + INTERVAL 30 SECOND, 'Bidirectional', 'Success', 5, 3, NOW() - INTERVAL 1 HOUR + INTERVAL 30 SECOND, NOW() - INTERVAL 1 HOUR),
(2, NOW() - INTERVAL 2 HOUR, NOW() - INTERVAL 2 HOUR + INTERVAL 45 SECOND, 'Upload Only', 'Success', 3, 0, NOW() - INTERVAL 2 HOUR + INTERVAL 45 SECOND, NOW() - INTERVAL 2 HOUR),
(3, NOW() - INTERVAL 30 MINUTE, NOW() - INTERVAL 30 MINUTE + INTERVAL 20 SECOND, 'Download Only', 'Success', 0, 2, NOW() - INTERVAL 30 MINUTE + INTERVAL 20 SECOND, NOW() - INTERVAL 30 MINUTE);

-- ============================================
-- Update last_sync_time for test users
-- ============================================
UPDATE `users` SET `last_sync_time` = NOW() - INTERVAL 1 HOUR WHERE `id` = 1;
UPDATE `users` SET `last_sync_time` = NOW() - INTERVAL 2 HOUR WHERE `id` = 2;
UPDATE `users` SET `last_sync_time` = NOW() - INTERVAL 30 MINUTE WHERE `id` = 3;

-- ============================================
-- Create simple views for testing
-- ============================================

-- Active products view
CREATE VIEW `active_products` AS
SELECT * FROM `products` 
WHERE `deleted_at` IS NULL;

-- Active customers view
CREATE VIEW `active_customers` AS
SELECT * FROM `customers` 
WHERE `deleted_at` IS NULL;

-- Active transactions view
CREATE VIEW `active_transactions` AS
SELECT * FROM `transactions` 
WHERE `deleted_at` IS NULL;

-- ============================================
-- Enable foreign key checks
-- ============================================
SET foreign_key_checks = 1;

-- ============================================
-- Verification queries for testing
-- ============================================

-- Show table structure
SELECT 
    'users' as table_name, 
    COUNT(*) as record_count 
FROM `users`
UNION ALL
SELECT 
    'products' as table_name, 
    COUNT(*) as record_count 
FROM `products`
UNION ALL
SELECT 
    'customers' as table_name, 
    COUNT(*) as record_count 
FROM `customers`
UNION ALL
SELECT 
    'transactions' as table_name, 
    COUNT(*) as record_count 
FROM `transactions`
UNION ALL
SELECT 
    'sync_logs' as table_name, 
    COUNT(*) as record_count 
FROM `sync_logs`;

-- Test data summary
SELECT 'Test database setup completed successfully!' as message,
       NOW() as setup_time,
       DATABASE() as database_name;
