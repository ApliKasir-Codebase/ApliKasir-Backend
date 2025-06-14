// routes/auth.routes.js
const controller = require("../controllers/auth.controller.js");
const { validateRegister, validateLogin } = require("../middleware/requestValidator.js");
const multer = require('multer'); // <-- Impor multer

// Konfigurasi multer (simpan di memori untuk diproses)
const storage = multer.memoryStorage(); // Simpan file di buffer memori
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Batas ukuran file 5MB (sesuaikan)
    fileFilter: (req, file, cb) => { // Filter hanya gambar
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Hanya file gambar yang diizinkan!'), false);
        }
    }
}); // Nama field di form-data harus 'profileImage'

module.exports = function(app) {
    app.use(function(req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "x-access-token, Authorization, Origin, Content-Type, Accept"
        );
        next();
    });

    // Terapkan middleware upload.single SEBELUM validator dan controller
    // Field name 'profileImage' harus sama dengan yg dikirim Flutter
    app.post(
        "/api/auth/register",
        upload.single('profileImage'), // Middleware Multer untuk 1 file
        validateRegister,              // Middleware validasi teks
        controller.register            // Controller register
    );

    app.post("/api/auth/login", validateLogin, controller.login);
};