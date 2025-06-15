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

// Helper function to build update fields and values
const buildUpdateFields = async (req) => {
    const { name, email, phoneNumber, storeName, storeAddress, profileImagePath, newPassword } = req.body;
    let updateFields = [];
    let updateValues = [];

    const fieldMappings = [
        { field: name, column: "name" },
        { field: email, column: "email" },
        { field: phoneNumber, column: "phoneNumber" },
        { field: storeName, column: "storeName" },
        { field: storeAddress, column: "storeAddress" },
        { field: profileImagePath, column: "profileImagePath" }
    ];

    fieldMappings.forEach(({ field, column }) => {
        if (field !== undefined) {
            updateFields.push(`${column} = ?`);
            updateValues.push(field);
        }
    });

    if (newPassword) {
        const passwordHash = await passwordUtils.hashPassword(newPassword);
        updateFields.push("passwordHash = ?");
        updateValues.push(passwordHash);
    }

    return { updateFields, updateValues };
};

// Helper function to handle successful update
const handleSuccessfulUpdate = async (userId) => {
    const selectSql = 'SELECT id, name, email, phoneNumber, storeName, storeAddress, profileImagePath, created_at, updated_at, last_sync_time FROM users WHERE id = ?';
    const [updatedUserRows] = await db.query(selectSql, [userId]);
    
    if (updatedUserRows.length > 0) {
        return { message: "Profile updated successfully.", user: updatedUserRows[0] };
    }
    return { message: "Profile updated successfully, but failed to fetch updated details." };
};

// Helper function to handle no rows affected
const handleNoRowsAffected = async (userId) => {
    const [userExists] = await db.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (userExists.length === 0) {
        return { status: 404, message: "User not found." };
    }
    return { status: 200, message: "No changes detected or user not found." };
};

// Helper function to handle database errors
const handleDatabaseError = (error) => {
    if (error.code === 'ER_DUP_ENTRY') {
        if (error.sqlMessage?.includes('email')) {
            return { status: 409, message: "Update failed! Email is already in use by another account." };
        } else if (error.sqlMessage?.includes('phoneNumber') || error.sqlMessage?.includes('phonenumber')) {
            return { status: 409, message: "Update failed! Phone number is already in use by another account." };
        }
        return { status: 409, message: "Update failed! Duplicate entry detected." };
    }
    return { status: 500, message: error.message || "Error updating user profile." };
};

// Update User Profile
exports.updateUserProfile = async (req, res) => {
    const userId = req.userId;

    try {
        const { updateFields, updateValues } = await buildUpdateFields(req);

        if (updateFields.length === 0) {
            return res.status(400).send({ message: "No fields provided for update." });
        }

        updateFields.push("updated_at = NOW()");
        updateValues.push(userId);

        const sql = `UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`;
        const [result] = await db.query(sql, updateValues);

        if (result.affectedRows > 0) {
            const response = await handleSuccessfulUpdate(userId);
            res.status(200).send(response);
        } else {
            const { status, message } = await handleNoRowsAffected(userId);
            res.status(status).send({ message });
        }
    } catch (error) {
        console.error("Update User Profile Error:", error);
        const { status, message } = handleDatabaseError(error);
        res.status(status).send({ message });
    }
};