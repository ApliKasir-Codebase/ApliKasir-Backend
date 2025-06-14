// controllers/auth.controller.js
const db = require("../config/db.config.js");
const config = require("../config/auth.config.js");
const passwordUtils = require("../utils/passwordUtils.js");
const jwt = require("jsonwebtoken");
const { uploadImageToFirebase } = require('../utils/firebaseStorage.helper');

exports.register = async (req, res) => {
    const { name, email, phoneNumber, storeName, storeAddress, password } = req.body;
    const profileImageFile = req.file;

    let profileImageUrl = null;

    try {
        if (profileImageFile) {
            console.log("Profile image file detected, attempting upload...");
            try {
                profileImageUrl = await uploadImageToFirebase(
                    profileImageFile.buffer,
                    profileImageFile.originalname
                );
                console.log("Image uploaded, URL:", profileImageUrl);
            } catch (uploadError) {
                console.error("Firebase upload failed:", uploadError);
            }
        }

        const passwordHash = await passwordUtils.hashPassword(password);

        const sql = `INSERT INTO users (name, email, phoneNumber, storeName, storeAddress, passwordHash, profileImagePath) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        const [result] = await db.query(sql, [
            name, email, phoneNumber, storeName, storeAddress, passwordHash,
            profileImageUrl
        ]);

        if (result.insertId) {
            const [newUserRows] = await db.query('SELECT id, name, email, phoneNumber, storeName, storeAddress, profileImagePath, created_at, updated_at FROM users WHERE id = ?', [result.insertId]);
             if (newUserRows.length > 0) {
                res.status(201).send({ message: "User registered successfully!", user: newUserRows[0] });
            } else {
                res.status(201).send({ message: "User registered successfully, but failed to fetch details."});
            }
        } else {
            res.status(500).send({ message: "Failed to register user record." });
        }

    } catch (error) {
        console.error("Registration Error:", error);
         if (error.code === 'ER_DUP_ENTRY') {
            if (error.sqlMessage.includes('email')) {
                return res.status(409).send({ message: "Failed! Email is already in use!" });
            } else if (error.sqlMessage.includes('phoneNumber')) {
                return res.status(409).send({ message: "Failed! Phone number is already in use!" });
            }
            return res.status(409).send({ message: "Failed! Unique constraint violation." });
        }
        res.status(500).send({ message: error.message || "Some error occurred while registering the user." });
    }
};

// --- Fungsi Login---
exports.login = async (req, res) => {
    const { identifier, password } = req.body;

    try {
        const sql = `SELECT id, name, email, phoneNumber, storeName, storeAddress, passwordHash, profileImagePath, created_at, updated_at FROM users WHERE email = ? OR phoneNumber = ?`;
        const [rows] = await db.query(sql, [identifier, identifier]);

        if (rows.length === 0) {
            return res.status(404).send({ message: "User Not found." });
        }

        const user = rows[0];
        const passwordIsValid = await passwordUtils.verifyPassword(password, user.passwordHash);

        if (!passwordIsValid) {
            return res.status(401).send({ accessToken: null, message: "Invalid Password!" });
        }

        const token = jwt.sign({ id: user.id }, config.secret); // 24 hours

        delete user.passwordHash; // Hapus hash sebelum kirim

        res.status(200).send({
            message: "Login successful!",
            accessToken: token,
            user: user
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).send({ message: error.message || "Some error occurred during login." });
    }
};