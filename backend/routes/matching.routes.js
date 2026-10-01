const express = require("express");

const router = express.Router();

const matchingController = require("../controllers/matching.controller");
const authMiddleware = require("../middleware/auth.middleware");

// ==========================================
// FIND / OFFER NEXT CAPTAIN
// ==========================================

router.post(
    "/find",
    authMiddleware.authUser,
    matchingController.findMatchingCaptains
);

module.exports = router;
