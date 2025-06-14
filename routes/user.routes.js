// routes/user.routes.js
const controller = require("../controllers/user.controller.js");
const { verifyToken } = require("../middleware/authJwt.js");
const { validateUpdateUserProfile } = require("../middleware/requestValidator.js");

module.exports = function(app) {
    app.use(function(req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "x-access-token, Authorization, Origin, Content-Type, Accept"
        );
        next();
    });

    // Endpoint user profile memerlukan token
    app.get("/api/user/profile", [verifyToken], controller.getUserProfile);         // GET profil user login
    app.put("/api/user/profile", [verifyToken, validateUpdateUserProfile], controller.updateUserProfile); // PUT update profil
    // app.delete("/api/user/profile", [verifyToken], controller.deleteUserAccount); // Hapus akun (jika diimplementasikan)
};