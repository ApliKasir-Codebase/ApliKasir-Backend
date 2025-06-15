# 🚀 Quick Start Guide - ApliKasir Backend

Panduan cepat untuk menjalankan ApliKasir Backend API dalam hitungan menit!

## ⚡ Quick Setup (5 menit)

### 1. Prerequisites Check
```bash
# Pastikan sudah terinstall:
node --version    # v14+ required
npm --version     # latest version
mysql --version   # v8.0+ recommended
```

### 2. Clone & Install
```bash
git clone <repository-url>
cd aplikasir-backend
npm install
```

### 3. Database Setup
```bash
# Login ke MySQL sebagai root
mysql -u root -p

# Jalankan script database
source database/schema.sql

# Atau import manual:
mysql -u root -p < database/schema.sql
```

### 4. Environment Configuration
```bash
# Copy template environment
cp .env.example .env

# Edit .env dengan konfigurasi Anda:
# - DB_USER, DB_PASSWORD, DB_NAME
# - JWT_SECRET (ubah dengan string random yang aman)
```

### 5. Start Server
```bash
npm start
# Server akan berjalan di http://localhost:3000
```

## ✅ Verification

### Test koneksi database:
```bash
curl http://localhost:3000
# Response: {"message": "Welcome to ApliKasir Backend API."}
```

### Test dengan Postman:
1. Import `ApliKasir_API_Collection.json` ke Postman
2. Set variable `baseUrl` = `http://localhost:3000`
3. Run collection untuk test semua endpoints

## 🏁 Production Deployment

### Environment Variables untuk Production:
```env
NODE_ENV=production
DB_HOST=your-production-db-host
DB_USER=your-production-db-user
DB_PASSWORD=your-secure-password
JWT_SECRET=your-super-secure-jwt-secret-key
PORT=3000
```

### Dengan PM2 (Process Manager):
```bash
# Install PM2
npm install -g pm2

# Start aplikasi
pm2 start server.js --name "aplikasir-api"

# Monitor
pm2 monit

# Restart otomatis saat server reboot
pm2 startup
pm2 save
```

### Dengan Docker (Optional):
```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

```bash
# Build & Run
docker build -t aplikasir-backend .
docker run -p 3000:3000 --env-file .env aplikasir-backend
```

## 🐛 Common Issues & Solutions

### Database connection failed:
```bash
# Check MySQL service
sudo systemctl status mysql   # Linux
brew services list | grep mysql   # macOS

# Reset password if needed
mysql -u root -p
ALTER USER 'root'@'localhost' IDENTIFIED BY 'newpassword';
FLUSH PRIVILEGES;
```

### Port 3000 already in use:
```bash
# Find process using port
lsof -i :3000   # macOS/Linux
netstat -ano | findstr :3000   # Windows

# Kill process
kill -9 <PID>   # macOS/Linux
taskkill /PID <PID> /F   # Windows
```

### JWT Token issues:
- Pastikan `JWT_SECRET` di .env tidak kosong
- Token expired? Login ulang untuk mendapat token baru
- Format Authorization header: `Bearer <token>`

## 📚 Next Steps

1. **Baca dokumentasi lengkap**: [README.md](README.md)
2. **Test API endpoints**: Gunakan Postman collection
3. **Setup monitoring**: Implement logging & metrics
4. **Security hardening**: Rate limiting, HTTPS, etc.
5. **Backup strategy**: Setup automated database backups

## 🆘 Need Help?

- 📖 **Documentation**: README.md
- 🐛 **Issues**: GitHub Issues
- 💬 **Discussions**: GitHub Discussions
- 📧 **Email**: support@aplikasir.com

---

**Happy coding! 🎉**
