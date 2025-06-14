// routes/sync.routes.js
const controller = require("../controllers/sync.controller.js");
const { verifyToken } = require("../middleware/authJwt.js");

module.exports = function(app) {
    app.use(function(req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "x-access-token, Authorization, Origin, Content-Type, Accept"
        );
        next();
    });    // Main synchronization endpoint
    app.post("/api/sync", [verifyToken], controller.synchronize);
    
    // Upload-only synchronization (no download)
    app.post("/api/sync/upload", [verifyToken], controller.synchronizeUploadOnly);
    
    // Download-only synchronization (no upload)
    app.post("/api/sync/download", [verifyToken], controller.synchronizeDownloadOnly);
    
    // Get sync status and recent logs
    app.get("/api/sync/status", [verifyToken], controller.getSyncStatus);
    
    // Force full sync (reset last sync time)
    app.post("/api/sync/reset", [verifyToken], controller.forceFullSync);
    
    // Get data summary for user
    app.get("/api/sync/summary", [verifyToken], controller.getDataSummary);
    
    // Backup user data
    app.get("/api/sync/backup", [verifyToken], controller.backupUserData);
    
    // Resolve conflicts manually
    app.post("/api/sync/resolve-conflicts", [verifyToken], controller.resolveConflicts);
    
    // Get detailed sync performance metrics
    app.get("/api/sync/metrics", [verifyToken], controller.getSyncMetrics);
};