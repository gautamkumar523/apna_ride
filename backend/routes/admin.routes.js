const express = require("express");
const router = express.Router();

const adminController = require("../controllers/admin.controller");
const adminMiddleware = require("../middleware/admin.middleware");

router.post("/login", adminController.loginAdmin);

router.get(
    "/stats",
    adminMiddleware.authAdmin,
    adminController.getDashboardStats
);

router.get(
    "/pending-captains",
    adminMiddleware.authAdmin,
    adminController.getPendingCaptains
);

router.get(
    "/all-captains",
    adminMiddleware.authAdmin,
    adminController.getAllCaptains
);

router.get(
    "/all-rides",
    adminMiddleware.authAdmin,
    adminController.getAllRides
);

router.patch(
    "/approve-captain/:id",
    adminMiddleware.authAdmin,
    adminController.approveCaptain
);

router.patch(
    "/reject-captain/:id",
    adminMiddleware.authAdmin,
    adminController.rejectCaptain
);

module.exports = router;