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
