// controllers/user.controller.js
const db = require("../config/db.config.js");
const passwordUtils = require("../utils/passwordUtils.js");

// Get User Profile (User yang sedang login)
exports.getUserProfile = async (req, res) => {
    const userId = req.userId; // Diambil dari middleware verifyToken

    try {
        const sql = `SELECT id, name, email, phoneNumber, storeName, storeAddress, profileImagePath, created_at, updated_at, last_sync_time FROM users WHERE id = ?`;
        const [rows] = await db.query(sql, [userId]);

        if (rows.length > 0) {
            res.status(200).send(rows[0]);
        } else {
            res.status(404).send({ message: "User profile not found." });
        }
    } catch (error) {
        console.error("Get User Profile Error:", error);
        res.status(500).send({ message: error.message || "Error retrieving user profile." });
    }
};

// Update User Profile
exports.updateUserProfile = async (req, res) => {
    const userId = req.userId;
    const { name, email, phoneNumber, storeName, storeAddress, profileImagePath, newPassword } = req.body;

    try {
        let updateFields = [];
        let updateValues = [];

        // Bangun query dinamis berdasarkan field yang ada di request body
        if (name !== undefined) { updateFields.push("name = ?"); updateValues.push(name); }
        if (email !== undefined) { updateFields.push("email = ?"); updateValues.push(email); }
        if (phoneNumber !== undefined) { updateFields.push("phoneNumber = ?"); updateValues.push(phoneNumber); }
        if (storeName !== undefined) { updateFields.push("storeName = ?"); updateValues.push(storeName); }
        if (storeAddress !== undefined) { updateFields.push("storeAddress = ?"); updateValues.push(storeAddress); }
        if (profileImagePath !== undefined) { updateFields.push("profileImagePath = ?"); updateValues.push(profileImagePath); }

        // Handle password change
        if (newPassword) {
            const passwordHash = await passwordUtils.hashPassword(newPassword);
            updateFields.push("passwordHash = ?");
            updateValues.push(passwordHash);
        }

        if (updateFields.length === 0) {
            return res.status(400).send({ message: "No fields provided for update." });
        }

        // Tambahkan updated_at dan ID user untuk WHERE clause
        updateFields.push("updated_at = NOW()");
        updateValues.push(userId);

        const sql = `UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`;

        const [result] = await db.query(sql, updateValues);

        if (result.affectedRows > 0) {
            // Ambil data terbaru setelah update untuk dikirim balik
            const [updatedUserRows] = await db.query('SELECT id, name, email, phoneNumber, storeName, storeAddress, profileImagePath, created_at, updated_at, last_sync_time FROM users WHERE id = ?', [userId]);
            if (updatedUserRows.length > 0) {
                 res.status(200).send({ message: "Profile updated successfully.", user: updatedUserRows[0] });
            } else {
                 res.status(200).send({ message: "Profile updated successfully, but failed to fetch updated details." });
            }

        } else {
            // Cek apakah user memang ada
             const [userExists] = await db.query('SELECT id FROM users WHERE id = ?', [userId]);
             if (userExists.length === 0) {
                 return res.status(404).send({ message: "User not found." });
             }
             // Jika user ada tapi affectedRows = 0, mungkin data sama
            res.status(200).send({ message: "No changes detected or user not found." });
        }
    } catch (error) {
        console.error("Update User Profile Error:", error);
        if (error.code === 'ER_DUP_ENTRY') {
             if (error.sqlMessage.includes('email')) {
                return res.status(409).send({ message: "Update failed! Email is already in use by another account." });
            } else if (error.sqlMessage.includes('phoneNumber')) {
                return res.status(409).send({ message: "Update failed! Phone number is already in use by another account." });
            }
        }
        res.status(500).send({ message: error.message || "Error updating user profile." });
    }
};

// // Delete User Account (PERLU KEHATI-HATIAN EKSTRA!)
// // Biasanya tidak diimplementasikan atau memerlukan konfirmasi berlapis
// exports.deleteUserAccount = async (req, res) => {
//     const userId = req.userId;
//     // Implementasi logika delete (hard delete atau soft delete)
//     // Pastikan ada konfirmasi password atau mekanisme keamanan lain
//     // Hati-hati dengan data terkait (produk, transaksi, dll.) jika menggunakan ON DELETE CASCADE
//     res.status(501).send({ message: "Delete account endpoint not implemented." });
// }