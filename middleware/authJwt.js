// middleware/authJwt.js
const jwt = require("jsonwebtoken");
const config = require("../config/auth.config.js");

const verifyToken = (req, res, next) => {
    // Coba ambil token dari header Authorization (Bearer Token)
    let token = req.headers["authorization"];

    if (!token) {
        // Coba ambil dari header x-access-token (alternatif)
        token = req.headers["x-access-token"];
    }

    if (!token) {
        return res.status(403).send({ message: "No token provided!" });
    }    // Jika formatnya "Bearer <token>", ekstrak tokennya
    if (token.startsWith('Bearer ')) {
        token = token.slice(7, token.length);
    }


    jwt.verify(token, config.secret, (err, decoded) => {
        if (err) {
            console.error("JWT Verification Error:", err.message);
            // Handle spesifik error token
            if (err.name === 'TokenExpiredError') {
                return res.status(401).send({ message: "Unauthorized! Token was expired." });
            }
            return res.status(401).send({ message: "Unauthorized! Invalid Token." });
        }
        // Simpan user id ke request untuk digunakan controller lain
        req.userId = decoded.id;
        console.log(`Authenticated user ID: ${req.userId}`); // Logging
        next();
    });
};

module.exports = { verifyToken };