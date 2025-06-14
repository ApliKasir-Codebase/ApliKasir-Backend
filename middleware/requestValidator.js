// middleware/requestValidator.js
const { body, param, validationResult } = require('express-validator');

const validateRegister = [
    body('name').notEmpty().withMessage('Nama tidak boleh kosong').trim(),
    body('email').isEmail().withMessage('Format email tidak valid').normalizeEmail(),
    body('phoneNumber')
    .notEmpty().withMessage('Nomor telepon tidak boleh kosong')
    .trim()
    .matches(/^\+?[0-9]{9,15}$/) // Contoh: Opsional +, diikuti 9-15 digit
    .withMessage('Format nomor telepon tidak valid (harus 9-15 digit, bisa diawali +)')
    .isMobilePhone('id-ID').withMessage('Format nomor telepon tidak valid'), // Validasi setelah normalisasi
    body('storeName').notEmpty().withMessage('Nama toko tidak boleh kosong').trim(),
    body('storeAddress').notEmpty().withMessage('Alamat toko tidak boleh kosong').trim(),
    body('password').isLength({ min: 6 }).withMessage('Password minimal 6 karakter'),
    // Tambahkan validasi lain jika perlu

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // Ambil pesan error pertama saja untuk simplicity
            const firstError = errors.array({ onlyFirstError: true })[0].msg;
            return res.status(400).json({ message: firstError });
            // Atau kirim semua error:
            // return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

const validateLogin = [
    body('identifier').notEmpty().withMessage('Email atau nomor telepon tidak boleh kosong'),
    body('password').notEmpty().withMessage('Password tidak boleh kosong'),
    (req, res, next) => {
        const errors = validationResult(req);
         if (!errors.isEmpty()) {
            const firstError = errors.array({ onlyFirstError: true })[0].msg;
            return res.status(400).json({ message: firstError });
        }
        next();
    }
]

// Tambahkan fungsi validasi untuk endpoint lain (Product, Customer, Transaction)
// Contoh validateProduct:
const validateProduct = [
    body('nama_produk').notEmpty().withMessage('Nama produk tidak boleh kosong').trim(),
    body('kode_produk').notEmpty().withMessage('Kode produk tidak boleh kosong').trim(),
    body('jumlah_produk').isInt({ min: 0 }).withMessage('Jumlah produk harus angka non-negatif'),
    body('harga_modal').isFloat({ min: 0 }).withMessage('Harga modal harus angka non-negatif'),
    body('harga_jual').isFloat({ min: 0 }).withMessage('Harga jual harus angka non-negatif'),
    // gambar_produk bersifat opsional, tidak perlu validasi notEmpty
    (req, res, next) => {
        const errors = validationResult(req);
         if (!errors.isEmpty()) {
            const firstError = errors.array({ onlyFirstError: true })[0].msg;
            return res.status(400).json({ message: firstError });
        }
        next();
    }
]


const validateCustomer = [
    body('nama_pelanggan').notEmpty().withMessage('Nama pelanggan tidak boleh kosong').trim(),
    body('nomor_telepon').optional({ checkFalsy: true }).isMobilePhone('id-ID').withMessage('Format nomor telepon tidak valid (jika diisi)').trim(),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const firstError = errors.array({ onlyFirstError: true })[0].msg;
            return res.status(400).json({ message: firstError });
        }
        next();
    }
];

const validateTransaction = [
    body('tanggal_transaksi').optional().isISO8601().toDate().withMessage('Format tanggal transaksi tidak valid'), // Bisa di-generate server jika tidak dikirim
    body('total_belanja').isFloat({ min: 0 }).withMessage('Total belanja harus angka non-negatif'),
    body('total_modal').isFloat({ min: 0 }).withMessage('Total modal harus angka non-negatif'),
    body('metode_pembayaran').isIn(['Tunai', 'QRIS', 'Kredit', 'Pembayaran Kredit Tunai', 'Pembayaran Kredit QRIS']).withMessage('Metode pembayaran tidak valid'),
    body('status_pembayaran').isIn(['Lunas', 'Belum Lunas']).withMessage('Status pembayaran tidak valid'),
    body('id_pelanggan').optional({ nullable: true }).isInt().withMessage('ID Pelanggan harus angka (jika ada)'),
    body('detail_items').isArray({ min: 1 }).withMessage('Detail item harus ada minimal 1'),
    // Validasi isi detail_items bisa lebih kompleks, contoh sederhana:
    body('detail_items.*.product_id').isInt().withMessage('ID Produk dalam detail item harus angka'),
    body('detail_items.*.quantity').isInt({ gt: 0 }).withMessage('Jumlah produk dalam detail item harus lebih dari 0'),
    body('detail_items.*.harga_jual').isFloat({ min: 0 }).withMessage('Harga jual dalam detail item tidak valid'),
    body('jumlah_bayar').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Jumlah bayar tidak valid'),
    body('jumlah_kembali').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Jumlah kembali tidak valid'),
    body('id_transaksi_hutang').optional({ nullable: true }).isInt().withMessage('ID Transaksi Hutang tidak valid'),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const firstError = errors.array({ onlyFirstError: true })[0].msg;
            console.error("Transaction Validation Errors:", errors.array()); // Log errors
            return res.status(400).json({ message: firstError });
        }
        next();
    }
];

const validateUpdateUserProfile = [
    // Validasi mirip register tapi optional karena ini update
    body('name').optional().notEmpty().withMessage('Nama tidak boleh kosong').trim(),
    body('email').optional().isEmail().withMessage('Format email tidak valid').normalizeEmail(),
    body('phoneNumber').optional().isMobilePhone('id-ID').withMessage('Format nomor telepon tidak valid'),
    body('storeName').optional().notEmpty().withMessage('Nama toko tidak boleh kosong').trim(),
    body('storeAddress').optional().notEmpty().withMessage('Alamat toko tidak boleh kosong').trim(),
    // Validasi password baru HANYA jika diisi
    body('newPassword').optional({ checkFalsy: true }) // Hanya validasi jika tidak kosong/null
        .isLength({ min: 6 }).withMessage('Password baru minimal 6 karakter')
        // Cek konfirmasi jika password baru diisi
        .custom((value, { req }) => {
            if (value && !req.body.confirmPassword) {
                throw new Error('Konfirmasi password baru diperlukan');
            }
            if (value && req.body.confirmPassword && value !== req.body.confirmPassword) {
                throw new Error('Konfirmasi password baru tidak cocok');
            }
            return true;
        }),
    // Tidak perlu validasi confirmPassword di sini karena sudah dicek oleh custom validator di atas

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const firstError = errors.array({ onlyFirstError: true })[0].msg;
             console.error("User Update Validation Errors:", errors.array()); // Log errors
            return res.status(400).json({ message: firstError });
        }
        next();
    }
];

// Validasi umum untuk parameter ID di URL
const validateIdParam = [
    param('id').isInt().withMessage('Parameter ID tidak valid'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const firstError = errors.array({ onlyFirstError: true })[0].msg;
            return res.status(400).json({ message: firstError });
        }
        next();
    }
];


module.exports = {
    validateRegister,
    validateLogin,
    validateProduct,
    validateCustomer,
    validateTransaction,
    validateUpdateUserProfile,
    validateIdParam,
};