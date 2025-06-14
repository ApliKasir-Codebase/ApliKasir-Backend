// config/db.config.js
const mysql = require('mysql2/promise'); // Gunakan versi promise
const dotenv = require('dotenv');
dotenv.config(); // Muat variabel dari .env

// Buat connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'aplikasir_db',
    waitForConnections: true,
    connectionLimit: 10, // Sesuaikan sesuai kebutuhan
    queueLimit: 0
});

// Tes koneksi (opsional tapi bagus)
pool.getConnection()
    .then(connection => {
        console.log('Successfully connected to the database.');
        connection.release(); // Lepaskan koneksi setelah tes
    })
    .catch(err => {
        console.error('Error connecting to the database:', err);
        // Mungkin perlu keluar dari aplikasi jika koneksi gagal saat startup
        // process.exit(1);
    });

module.exports = pool;