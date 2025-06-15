// utils/firebaseStorage.helper.js
const { Storage } = require('@google-cloud/storage');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config(); // Pastikan .env dimuat

// Cek variabel environment
const requiredEnvVars = ['FIREBASE_PROJECT_ID', 'FIREBASE_BUCKET_NAME', 'GOOGLE_APPLICATION_CREDENTIALS'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error(`FATAL ERROR: Missing Firebase environment variables: ${missingVars.join(', ')}`);
    // process.exit(1); // Mungkin keluar jika kritis
}

// Inisialisasi storage
// GOOGLE_APPLICATION_CREDENTIALS akan otomatis dibaca jika env var diset
const storage = new Storage({
    projectId: process.env.FIREBASE_PROJECT_ID,
});

const bucketName = process.env.FIREBASE_BUCKET_NAME;
const bucket = storage.bucket(bucketName);
console.log(`Firebase Storage initialized for bucket: ${bucketName}`);


/**
 * Uploads a file buffer to Firebase Storage.
 * @param {Buffer} buffer The file buffer from multer.
 * @param {string} originalname Original filename from upload.
 * @param {string} destinationPath Path within the bucket (e.g., 'profile_images/'). Default is 'profile_images/'.
 * @returns {Promise<string|null>} The public URL of the uploaded file, or null on error.
 */
const uploadImageToFirebase = (buffer, originalname, destinationPath = 'profile_images/') => {
    return new Promise((resolve, reject) => {        if (!buffer || !originalname) {
            return reject(new Error('Invalid file buffer or originalname provided.'));
        }

        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(originalname);        // Pastikan destinationPath diakhiri slash jika ada isinya
        if (destinationPath && !destinationPath.endsWith('/')) {
            destinationPath += '/';
        }
        const blobName = `${destinationPath}profile_${uniqueSuffix}${fileExtension}`;
        const blob = bucket.file(blobName);

        const blobStream = blob.createWriteStream({
            resumable: false, // Lebih simpel untuk gambar profil
            metadata: {
                // Coba deteksi tipe konten dasar
                contentType: `image/${fileExtension.substring(1).toLowerCase()}`
            }
        });        blobStream.on('error', (err) => {
            console.error("Firebase Storage Upload Error:", err);
            reject(new Error(`Error uploading image: ${err.message}`));
        });

        blobStream.on('finish', async () => {
            console.log(`File ${blobName} uploaded to Firebase Storage.`);
            // Buat file publik (sesuaikan aturan keamanan di Firebase jika perlu)
            try {
                await blob.makePublic();
                const publicUrl = `https://storage.googleapis.com/${bucketName}/${blobName}`;
                console.log(`File made public: ${publicUrl}`);
                resolve(publicUrl); // Kembalikan URL publik
            } catch (publicError) {
                console.error("Error making file public:", publicError);
                // Kembalikan gs:// path sebagai fallback jika gagal makePublic
                // Aplikasi mungkin masih bisa akses jika permission diatur beda
                resolve(`gs://${bucketName}/${blobName}`);
                // Atau reject jika URL publik absolut diperlukan
                // reject(new Error(`Error making file public: ${publicError.message}`));
            }
        });

        blobStream.end(buffer);
    });
};

module.exports = { uploadImageToFirebase };