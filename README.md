# 🏪 ApliKasir Backend API

Backend API untuk aplikasi kasir (Point of Sale) yang mendukung sinkronisasi data real-time antara mobile app dan server.

## 📋 Daftar Isi

- [Fitur Utama](#-fitur-utama)
- [Teknologi yang Digunakan](#-teknologi-yang-digunakan)
- [Instalasi & Setup](#-instalasi--setup)
- [Konfigurasi Environment](#️-konfigurasi-environment)
- [Menjalankan Server](#-menjalankan-server)
- [API Endpoints](#-api-endpoints)
- [Testing dengan Postman](#-testing-dengan-postman)
- [Struktur Proyek](#-struktur-proyek)
- [Struktur Database](#️-struktur-database)
- [Dokumentasi API](#-dokumentasi-api)
- [Troubleshooting](#-troubleshooting)
- [NPM Scripts](#-npm-scripts)
- [Contributing](#-contributing)
- [Support](#-support)

## 🚀 Fitur Utama

- **Autentikasi Pengguna**: Registrasi dan login dengan JWT tokens
- **Manajemen Profil**: CRUD operasi untuk profil pengguna
- **Sinkronisasi Data**: Bidirectional sync antara mobile dan server
- **Upload/Download**: Sync terpisah untuk upload-only atau download-only
- **Conflict Resolution**: Penanganan konflik data otomatis
- **Performance Metrics**: Monitoring performa sinkronisasi
- **Firebase Storage**: Integrasi untuk penyimpanan file
- **Validasi Data**: Input validation dengan express-validator

## 🛠 Teknologi yang Digunakan

### Backend Framework
- **Runtime**: Node.js (JavaScript runtime yang cepat)
- **Framework**: Express.js (Web framework minimal dan fleksibel)
- **Database**: MySQL dengan mysql2 driver
- **Authentication**: JWT (JSON Web Tokens) untuk stateless auth

### Security & Validation  
- **Password Hashing**: bcryptjs (secure password encryption)
- **Input Validation**: express-validator (robust input validation)
- **CORS**: cors middleware (Cross-Origin Resource Sharing)

### Storage & Environment
- **File Storage**: Google Cloud Storage (untuk upload gambar)
- **Environment**: dotenv (environment variables management)
- **Development**: nodemon (auto-restart pada development)

## 📦 Instalasi & Setup

### Prerequisites

Pastikan sudah menginstall:

- [Node.js](https://nodejs.org/) (v14 atau lebih baru)
- [MySQL](https://www.mysql.com/) (v8.0 atau lebih baru) 
- [Git](https://git-scm.com/)
- [Postman](https://www.postman.com/) (untuk testing API)
- Firebase Project (opsional, untuk storage)

### 1. Clone Repository

```bash
git clone <repository-url>
cd aplikasir-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Database

Buat database MySQL dan tabel secara otomatis:

```bash
# Pastikan MySQL server sudah berjalan
npm run setup-db
```

Atau manual:
```bash
mysql -u root -p < database/schema.sql
```

> 💡 **Tip**: Struktur database lengkap tersedia di file `database/schema.sql`

## ⚙️ Konfigurasi Environment

Copy file `.env.example` ke `.env` dan sesuaikan konfigurasi:

```bash
cp .env.example .env
```

Kemudian edit file `.env` dengan konfigurasi Anda:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=aplikasir_db
DB_PORT=3306

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=24h

# Google Cloud Storage (Opsional)
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_KEYFILE=./serviceAccountKey.json
GOOGLE_CLOUD_STORAGE_BUCKET=your-bucket-name
```

> ⚠️ **Penting**: Jangan gunakan konfigurasi default di production. Ganti semua nilai dengan konfigurasi yang aman.

### Google Cloud Storage Setup (Opsional)

Jika menggunakan Google Cloud Storage, letakkan file `serviceAccountKey.json` di root directory:

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Buat Service Account dan download JSON key
3. Rename menjadi `serviceAccountKey.json`
4. Letakkan di root directory project

> 📖 **Note**: File ini sudah ada dalam `.gitignore` untuk keamanan

## 🚀 Menjalankan Server

### Development Mode (dengan auto-reload)

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

Server akan berjalan di `http://localhost:3000` (atau port yang dikonfigurasi di `.env`)

> 💡 **Quick Start**: Untuk setup cepat, ikuti panduan di [QUICKSTART.md](./QUICKSTART.md)

## 📡 API Endpoints

### 🔐 Authentication

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/auth/register` | Registrasi user baru |
| POST | `/api/auth/login` | Login user |

### 👤 User Profile

| Method | Endpoint | Deskripsi | Auth Required |
|--------|----------|-----------|---------------|
| GET | `/api/user/profile` | Get profil user | ✅ |
| PUT | `/api/user/profile` | Update profil user | ✅ |

### 🔄 Synchronization

| Method | Endpoint | Deskripsi | Auth Required |
|--------|----------|-----------|---------------|
| POST | `/api/sync` | Full bidirectional sync | ✅ |
| POST | `/api/sync/upload` | Upload-only sync | ✅ |
| POST | `/api/sync/download` | Download-only sync | ✅ |
| POST | `/api/sync/resolve-conflicts` | Resolve data conflicts | ✅ |
| GET | `/api/sync/metrics` | Get sync performance metrics | ✅ |

## 🧪 Testing dengan Postman

### Import Collection

1. Buka Postman
2. Import file `ApliKasir_API_Collection.json` 
3. Set environment variables:
   - `baseUrl`: `http://localhost:3000`

### Automated Testing

```bash
# Install Newman (jika belum ada)
npm install -g newman

# Run collection otomatis
npm run postman-test
```

### Manual Testing Flow

1. **Register User** - Buat akun baru
2. **Login User** - Login dan dapatkan access token  
3. **Get Profile** - Test get user profile
4. **Update Profile** - Test update user profile
5. **Full Sync** - Test sinkronisasi bidirectional
6. **Upload Sync** - Test upload-only
7. **Download Sync** - Test download-only

### Expected Results

✅ Semua requests harus berhasil (status 200-201)  
✅ Access token otomatis tersimpan setelah login  
✅ Sync endpoints mengembalikan data yang benar
✅ Error handling berfungsi dengan baik (status 400, 401, 409, 500)

## � Struktur Proyek

```
aplikasir-backend/
├── 📁 config/              # Konfigurasi database dan auth
│   ├── auth.config.js
│   └── db.config.js
├── 📁 controllers/         # Logic bisnis aplikasi
│   ├── auth.controller.js
│   ├── sync.controller.js
│   └── user.controller.js
├── 📁 database/           # Database schema dan migrations
│   └── schema.sql
├── 📁 middleware/         # Middleware untuk validation dan auth
│   ├── authJwt.js
│   └── requestValidator.js
├── 📁 routes/            # Definisi routing API
│   ├── auth.routes.js
│   ├── sync.routes.js
│   └── user.routes.js
├── 📁 utils/             # Utility functions
│   ├── firebaseStorage.helper.js
│   └── passwordUtils.js
├── 📄 server.js          # Entry point aplikasi
├── 📄 package.json       # Dependencies dan scripts
├── 📄 .env.example       # Template environment variables
├── 📄 .gitignore         # File yang diabaikan git
├── 📄 README.md          # Dokumentasi utama
├── 📄 QUICKSTART.md      # Panduan setup cepat
├── 📄 API_DOCUMENTATION.md # Dokumentasi API detail
├── 📄 CHANGELOG.md       # Riwayat perubahan
└── 📄 ApliKasir_API_Collection.json  # Postman collection
```

> 📖 **Dokumentasi Lengkap**: 
> - [API Documentation](./API_DOCUMENTATION.md) - Detail semua endpoint
> - [Quick Start Guide](./QUICKSTART.md) - Setup dalam 5 menit
> - [Changelog](./CHANGELOG.md) - Riwayat update

## 🗄️ Struktur Database

Database menggunakan MySQL dengan 5 tabel utama untuk mengelola data kasir:

> 📄 **Schema Lengkap**: Lihat file `database/schema.sql` untuk struktur database lengkap

### Tabel Users

```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phoneNumber VARCHAR(20) UNIQUE,
    storeName VARCHAR(255),
    storeAddress TEXT,
    passwordHash VARCHAR(255) NOT NULL,
    profileImagePath VARCHAR(500),
    last_sync_time DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Tabel Products

```sql
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    nama_produk VARCHAR(255) NOT NULL,
    kode_produk VARCHAR(100),
    jumlah_produk INT DEFAULT 0,
    harga_modal DECIMAL(15,2) DEFAULT 0,
    harga_jual DECIMAL(15,2) DEFAULT 0,
    gambar_produk VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Tabel Customers

```sql
CREATE TABLE customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    nama_pelanggan VARCHAR(255) NOT NULL,
    nomor_telepon VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Tabel Transactions

```sql
CREATE TABLE transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    tanggal_transaksi DATETIME NOT NULL,
    total_belanja DECIMAL(15,2) NOT NULL,
    total_modal DECIMAL(15,2) DEFAULT 0,
    metode_pembayaran ENUM('cash', 'debit', 'credit', 'qris') DEFAULT 'cash',
    status_pembayaran ENUM('pending', 'paid', 'cancelled') DEFAULT 'pending',
    id_pelanggan INT,
    detail_items JSON,
    jumlah_bayar DECIMAL(15,2) DEFAULT 0,
    jumlah_kembali DECIMAL(15,2) DEFAULT 0,
    id_transaksi_hutang INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (id_pelanggan) REFERENCES customers(id) ON DELETE SET NULL
);
```

### Tabel Sync Logs

```sql
CREATE TABLE sync_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    sync_start_time DATETIME NOT NULL,
    sync_end_time DATETIME,
    direction ENUM('Upload Only', 'Download Only', 'Bidirectional') NOT NULL,
    status ENUM('In Progress', 'Success', 'Partial Success', 'Failed') NOT NULL,
    items_uploaded INT DEFAULT 0,
    items_downloaded INT DEFAULT 0,
    client_last_sync_time DATETIME,
    server_sync_time DATETIME,
    error_message TEXT,
    details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## 📚 Dokumentasi API

### Contoh Request/Response

#### Register User

**Request:**
```json
POST /api/auth/register
Content-Type: application/json

{
    "name": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "081234567890",
    "storeName": "Toko Berkah",
    "storeAddress": "Jl. Merdeka No. 123",
    "password": "password123"
}
```

**Response:**
```json
{
    "message": "User registered successfully!",
    "userId": 1
}
```

#### Login User

**Request:**
```json
POST /api/auth/login
Content-Type: application/json

{
    "identifier": "john@example.com",
    "password": "password123"
}
```

**Response:**
```json
{
    "message": "Login successful!",
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com",
        "phoneNumber": "081234567890",
        "storeName": "Toko Berkah",
        "storeAddress": "Jl. Merdeka No. 123"
    }
}
```

#### Full Sync

**Request:**
```json
POST /api/sync
Authorization: Bearer <access_token>
Content-Type: application/json

{
    "clientLastSyncTime": "2024-06-13T10:00:00.000Z",
    "localChanges": {
        "products": {
            "new": [...],
            "updated": [...],
            "deleted": [...]
        },
        "customers": {
            "new": [...],
            "updated": [...],
            "deleted": [...]
        },
        "transactions": {
            "new": [...],
            "deleted": [...]
        }
    }
}
```

**Response:**
```json
{
    "success": true,
    "serverSyncTime": "2024-06-13T12:00:00.000Z",
    "itemsUploaded": 3,
    "itemsDownloaded": 2,
    "serverChanges": {
        "products": { "new": [...], "updated": [...], "deleted": [...] },
        "customers": { "new": [...], "updated": [...], "deleted": [...] },
        "transactions": { "new": [...], "updated": [...], "deleted": [...] }
    },
    "conflicts": [],
    "errors": []
}
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Database Connection Error

**Error:** `Error: connect ECONNREFUSED`

**Solution:**
- Pastikan MySQL server berjalan
- Cek konfigurasi database di `.env`
- Pastikan database sudah dibuat

#### 2. JWT Token Error

**Error:** `Unauthorized! Invalid Token`

**Solution:**
- Pastikan header Authorization format: `Bearer <token>`
- Cek JWT_SECRET di `.env`
- Login ulang untuk mendapat token baru

#### 3. Validation Error

**Error:** `ValidationError: Email format invalid`

**Solution:**
- Cek format input sesuai requirement
- Pastikan semua field required terisi
- Cek panjang password minimal 6 karakter

#### 4. Port Already in Use

**Error:** `EADDRINUSE: address already in use :::3000`

**Solution:**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3000
kill -9 <PID>
```

### Logs & Debugging

Server logs akan menampilkan:
- Database connection status
- API request details
- Sync performance metrics
- Error stack traces

## 📝 NPM Scripts

| Script | Command | Deskripsi |
|--------|---------|-----------|
| `npm start` | `node server.js` | Jalankan server production |
| `npm run dev` | `nodemon server.js` | Development dengan auto-reload |
| `npm run setup-db` | `mysql -u root -p < database/schema.sql` | Setup database otomatis |
| `npm run backup-db` | `mysqldump...` | Backup database dengan timestamp |
| `npm run postman-test` | `newman run...` | Test koleksi Postman otomatis |

> 💡 **Tip**: Gunakan `npm run dev` untuk development agar server restart otomatis saat ada perubahan code

## 🤝 Contributing

1. Fork repository
2. Buat feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Buat Pull Request

### Development Guidelines

- Gunakan konvensi penamaan yang konsisten
- Tambahkan validasi untuk semua input
- Write tests untuk fitur baru
- Update dokumentasi jika diperlukan

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📞 Support

Jika menemui masalah atau butuh bantuan:

1. 📖 Cek bagian [Troubleshooting](#-troubleshooting)
2. 📚 Baca [API Documentation](./API_DOCUMENTATION.md)
3. 🐛 Buka issue di GitHub repository
4. 📝 Dokumentasikan error dengan detail (logs, steps to reproduce)

## 🔗 Links & Resources

- 📚 [API Documentation](./API_DOCUMENTATION.md) - Dokumentasi endpoint lengkap
- 🚀 [Quick Start Guide](./QUICKSTART.md) - Setup dalam 5 menit  
- 📋 [Changelog](./CHANGELOG.md) - Riwayat perubahan versi
- 🧪 [Postman Collection](./ApliKasir_API_Collection.json) - Testing collection
- 🗄️ [Database Schema](./database/schema.sql) - Struktur database

## 💡 Tips & Best Practices

- ✅ Selalu gunakan HTTPS di production
- 🔐 Ganti `JWT_SECRET` dengan value yang kuat dan acak
- 🛡️ Aktifkan rate limiting untuk mencegah spam
- 📊 Monitor log aplikasi secara berkala
- 💾 Backup database secara rutin
- 🔄 Update dependencies secara berkala untuk keamanan
- 🚫 Jangan commit file `.env` atau `serviceAccountKey.json`

---

**Made with ❤️ by ApliKasir Team** | **License**: MIT | **Version**: 1.0.0
