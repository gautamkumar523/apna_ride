const express = require("express");
const router = express.Router();

const rideController = require("../controllers/ride.controller");
const authMiddleware = require("../middleware/auth.middleware");

// ==========================================
// RIDE REQUEST & USER STATUS
// ==========================================
router.post(
    "/request",
    authMiddleware.authUser,
    rideController.requestRide
);

router.get(
    "/active",
    authMiddleware.authUser,
    rideController.getUserActiveRide
);

router.get(
    "/my-history",
    authMiddleware.authUser,
    rideController.getUserRideHistory
);

// ==========================================
// CAPTAIN ACTIVE RIDE & HISTORY
// ==========================================
router.get(
    "/captain/active",
    authMiddleware.authCaptain,
    rideController.getCaptainActiveRide
);

router.get(
    "/captain/history",
    authMiddleware.authCaptain,
    rideController.getCaptainRideHistory
);

// ==========================================
// SPECIFIC RIDE DETAILS
// ==========================================
router.get(
    "/:rideId",
    authMiddleware.authUserOrCaptain,
    rideController.getRideDetails
);

// ==========================================
// RIDE LIFECYCLE (CAPTAIN ACTIONS)
// ==========================================
router.patch(
    "/:rideId/accept",
    authMiddleware.authCaptain,
    rideController.acceptRide
);

router.patch(
    "/:rideId/reject",
    authMiddleware.authCaptain,
    rideController.rejectRide
);

router.patch(
    "/:rideId/arrived",
    authMiddleware.authCaptain,
    rideController.captainArrived
);

router.patch(
    "/:rideId/start",
    authMiddleware.authCaptain,
    rideController.startRide
);

router.patch(
    "/:rideId/complete",
    authMiddleware.authCaptain,
    rideController.completeRide
);

// ==========================================
// CANCEL RIDE (USER OR CAPTAIN)
// ==========================================
router.patch(
    "/:rideId/cancel",
    authMiddleware.authUserOrCaptain,
    rideController.cancelRide
);

module.exports = router;
