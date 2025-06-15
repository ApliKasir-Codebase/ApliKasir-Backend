# 📡 API Documentation - ApliKasir Backend

Dokumentasi lengkap untuk semua endpoint API yang tersedia.

## 🔗 Base URL
```
http://localhost:3000/api
```

## 🔐 Authentication

API menggunakan JWT (JSON Web Token) untuk autentikasi. Setelah login, sertakan token di header:

```
Authorization: Bearer <your_jwt_token>
```

## 📝 Response Format

### Success Response
```json
{
    "success": true,
    "data": { ... },
    "message": "Operation successful"
}
```

### Error Response
```json
{
    "success": false,
    "error": "Error message",
    "code": "ERROR_CODE"
}
```

## 🔐 Authentication Endpoints

### Register User
**POST** `/auth/register`

Register pengguna baru ke sistem.

**Request Body:**
```json
{
    "name": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "081234567890",
    "storeName": "Toko Berkah",
    "storeAddress": "Jl. Merdeka No. 123, Jakarta",
    "password": "password123"
}
```

**Response (201):**
```json
{
    "message": "User registered successfully!",
    "userId": 1
}
```

**Response (409 - Email exists):**
```json
{
    "message": "Failed! Email is already in use!"
}
```

**Response (400 - Validation error):**
```json
{
    "message": "Validation error: Invalid email format"
}
```

---

### Login User
**POST** `/auth/login`

Login pengguna dan mendapat JWT token.

**Request Body:**
```json
{
    "identifier": "john@example.com",
    "password": "password123"
}
```

**Response (200):**
```json
{
    "message": "Login successful!",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com",
        "phoneNumber": "081234567890",
        "storeName": "Toko Berkah",
        "storeAddress": "Jl. Merdeka No. 123, Jakarta"
    }
}
```

**Response (404 - User not found):**
```json
{
    "message": "User Not found."
}
```

**Response (401 - Wrong password):**
```json
{
    "message": "Invalid Password!"
}
```

## 👤 User Profile Endpoints

### Get User Profile
**GET** `/user/profile`

Mendapat informasi profil pengguna yang sedang login.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "081234567890",
    "storeName": "Toko Berkah",
    "storeAddress": "Jl. Merdeka No. 123, Jakarta",
    "profileImagePath": null,
    "lastSyncTime": "2024-06-13T13:00:00.000Z",
    "createdAt": "2024-06-10T08:00:00.000Z"
}
```

---

### Update User Profile
**PUT** `/user/profile`

Update informasi profil pengguna.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
    "name": "John Doe Updated",
    "phoneNumber": "081999888777",
    "storeName": "Toko Berkah Jaya",
    "storeAddress": "Jl. Merdeka No. 123A, Jakarta Pusat",
    "newPassword": "newpassword123",
    "confirmPassword": "newpassword123"
}
```

**Response (200):**
```json
{
    "message": "Profile updated successfully.",
    "user": {
        "id": 1,
        "name": "John Doe Updated",
        "email": "john@example.com",
        "phoneNumber": "081999888777",
        "storeName": "Toko Berkah Jaya",
        "storeAddress": "Jl. Merdeka No. 123A, Jakarta Pusat"
    }
}
```

**Response (409 - Duplicate data):**
```json
{
    "message": "Update failed! Phone number is already in use by another account."
}
```

## 🔄 Synchronization Endpoints

### Full Sync (Bidirectional)
**POST** `/sync`

Sinkronisasi bidirectional - upload perubahan lokal dan download perubahan server.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
    "clientLastSyncTime": "2024-06-13T10:00:00.000Z",
    "localChanges": {
        "products": {
            "new": [
                {
                    "local_id": 1,
                    "nama_produk": "Indomie Goreng",
                    "kode_produk": "IDM001",
                    "jumlah_produk": 50,
                    "harga_modal": 2500.0,
                    "harga_jual": 3000.0,
                    "gambar_produk": "/storage/products/indomie.jpg",
                    "created_at": "2024-06-13T08:30:00.000Z",
                    "updated_at": "2024-06-13T08:30:00.000Z",
                    "is_deleted": false
                }
            ],
            "updated": [],
            "deleted": []
        },
        "customers": {
            "new": [
                {
                    "local_id": 1,
                    "nama_pelanggan": "Ahmad Suryadi",
                    "nomor_telepon": "081234567890",
                    "created_at": "2024-06-13T09:00:00.000Z",
                    "updated_at": "2024-06-13T09:00:00.000Z",
                    "is_deleted": false
                }
            ],
            "updated": [],
            "deleted": []
        },
        "transactions": {
            "new": [
                {
                    "local_id": 1,
                    "tanggal_transaksi": "2024-06-13T10:15:00.000Z",
                    "total_belanja": 15000.0,
                    "total_modal": 12500.0,
                    "metode_pembayaran": "cash",
                    "status_pembayaran": "paid",
                    "id_pelanggan": null,
                    "detail_items": "[{\"product_id\":1,\"quantity\":5,\"price\":3000}]",
                    "jumlah_bayar": 15000.0,
                    "jumlah_kembali": 0.0,
                    "created_at": "2024-06-13T10:15:00.000Z",
                    "is_deleted": false
                }
            ],
            "deleted": []
        }
    }
}
```

**Response (200):**
```json
{
    "success": true,
    "serverSyncTime": "2024-06-13T12:00:00.000Z",
    "itemsUploaded": 3,
    "itemsDownloaded": 2,
    "serverChanges": {
        "products": {
            "new": [
                {
                    "id": 2,
                    "nama_produk": "Teh Botol Sosro",
                    "kode_produk": "TBS001",
                    "jumlah_produk": 24,
                    "harga_modal": 3000.0,
                    "harga_jual": 4000.0,
                    "created_at": "2024-06-13T11:30:00.000Z",
                    "updated_at": "2024-06-13T11:30:00.000Z"
                }
            ],
            "updated": [],
            "deleted": []
        },
        "customers": {
            "new": [],
            "updated": [],
            "deleted": []
        },
        "transactions": {
            "new": [],
            "updated": [],
            "deleted": []
        }
    },
    "conflicts": [],
    "errors": [],
    "performanceMetrics": {
        "uploadTime": 150,
        "downloadTime": 89,
        "totalTime": 250,
        "throughput": 20.0
    }
}
```

---

### Upload Only Sync
**POST** `/sync/upload`

Upload perubahan lokal ke server tanpa download.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
    "clientLastSyncTime": "2024-06-13T10:00:00.000Z",
    "localChanges": {
        "products": {
            "new": [
                {
                    "local_id": 2,
                    "nama_produk": "Aqua 600ml",
                    "kode_produk": "AQA600",
                    "jumlah_produk": 48,
                    "harga_modal": 1500.0,
                    "harga_jual": 2000.0,
                    "created_at": "2024-06-13T11:00:00.000Z",
                    "updated_at": "2024-06-13T11:00:00.000Z",
                    "is_deleted": false
                }
            ],
            "updated": [],
            "deleted": []
        },
        "customers": {"new": [], "updated": [], "deleted": []},
        "transactions": {"new": [], "deleted": []}
    }
}
```

**Response (200):**
```json
{
    "success": true,
    "serverSyncTime": "2024-06-13T12:30:00.000Z",
    "itemsUploaded": 1,
    "errors": []
}
```

---

### Download Only Sync
**POST** `/sync/download`

Download perubahan dari server tanpa upload.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
    "clientLastSyncTime": "2024-06-13T10:00:00.000Z"
}
```

**Response (200):**
```json
{
    "success": true,
    "serverSyncTime": "2024-06-13T13:00:00.000Z",
    "itemsDownloaded": 5,
    "serverChanges": {
        "products": {
            "new": [
                {
                    "id": 3,
                    "nama_produk": "Beng Beng",
                    "kode_produk": "BB001",
                    "jumlah_produk": 100,
                    "harga_modal": 1000.0,
                    "harga_jual": 1500.0,
                    "created_at": "2024-06-13T12:45:00.000Z",
                    "updated_at": "2024-06-13T12:45:00.000Z"
                }
            ],
            "updated": [],
            "deleted": []
        },
        "customers": {
            "new": [
                {
                    "id": 2,
                    "nama_pelanggan": "Siti Nurhaliza",
                    "nomor_telepon": "081987654321",
                    "created_at": "2024-06-13T12:30:00.000Z",
                    "updated_at": "2024-06-13T12:30:00.000Z"
                }
            ],
            "updated": [],
            "deleted": []
        },
        "transactions": {
            "new": [],
            "updated": [],
            "deleted": []
        }
    }
}
```

---

### Resolve Conflicts
**POST** `/sync/resolve-conflicts`

Resolve konflik data yang terjadi selama sinkronisasi.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
    "conflicts": [
        {
            "type": "product",
            "local_id": 1,
            "server_id": 1,
            "resolution": "use_server",
            "data": {
                "nama_produk": "Indomie Goreng (Server Version)",
                "kode_produk": "IDM001",
                "jumlah_produk": 45,
                "harga_modal": 2500.0,
                "harga_jual": 3200.0
            }
        }
    ]
}
```

**Response (200):**
```json
{
    "success": true,
    "resolvedConflicts": 1,
    "errors": []
}
```

---

### Get Sync Metrics
**GET** `/sync/metrics?days=7`

Mendapat metrics performa sinkronisasi.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `days` (optional): Jumlah hari untuk analisis (default: 7)

**Response (200):**
```json
{
    "success": true,
    "metrics": {
        "totalSyncs": 15,
        "successfulSyncs": 14,
        "failedSyncs": 1,
        "averageSyncTime": 1250,
        "totalItemsSynced": 45,
        "conflictsResolved": 3,
        "lastSyncTime": "2024-06-13T13:00:00.000Z",
        "performanceTrend": "improving",
        "errorPatterns": []
    }
}
```

## ⚠️ Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Token provided but access denied |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Duplicate data |
| 422 | Unprocessable Entity - Validation error |
| 500 | Internal Server Error - Server-side error |

## 🚦 Rate Limiting

Current rate limits:
- Authentication endpoints: 5 requests per minute
- Sync endpoints: 10 requests per minute  
- Other endpoints: 100 requests per minute

## 📊 Status Codes Summary

| Status | Meaning |
|--------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid request data |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Access denied |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Validation failed |
| 500 | Internal Server Error - Server error |

## 🧪 Testing

Use the provided Postman collection (`ApliKasir_API_Collection.json`) for comprehensive API testing. The collection includes:

- Pre-request scripts for token management
- Test assertions for response validation
- Environment variables for easy configuration
- Example requests for all endpoints

---

**For more details, see [README.md](README.md) and [QUICKSTART.md](QUICKSTART.md)**
