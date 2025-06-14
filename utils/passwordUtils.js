// utils/passwordUtils.js
const bcrypt = require('bcryptjs');

const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10); // Salt rounds
    return await bcrypt.hash(password, salt);
};

const verifyPassword = async (enteredPassword, storedHash) => {
    return await bcrypt.compare(enteredPassword, storedHash);
};

module.exports = {
    hashPassword,
    verifyPassword
};