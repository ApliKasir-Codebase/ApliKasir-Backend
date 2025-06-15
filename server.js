// server.js
const express = require("express");
const cors = require("cors");
const dotenv = require('dotenv');
const multer = require('multer');

dotenv.config();

const app = express();

const corsOptions = {
    origin: "*" // Izinkan semua origin (untuk development)
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));

app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ----- Routes -----
app.get("/", (req, res) => {
    res.json({ message: "Welcome to ApliKasir Backend API." });
});

// Impor dan gunakan routes
require('./routes/auth.routes')(app);
require('./routes/user.routes')(app);
require('./routes/sync.routes')(app);

// Error handling middleware should be after routes
app.use((err, req, res, next) => {
    console.error("Unhandled Error:", err.stack || err);

    // Tangani error Multer secara spesifik jika perlu
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: `File Upload Error: ${err.message}` });
    }
    res.status(err.status || 500).json({
        message: err.message || "Internal Server Error"
    });
});

// Export app for testing
module.exports = app;

// Only start server if this file is run directly (not when required by tests)
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}.`);
    });
}
