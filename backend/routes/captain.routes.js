const express = require("express");
const router = express.Router();

const captainController = require("../controllers/captain.controller");

const authMiddleware = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");
const captainApprovalMiddleware = require("../middleware/captainApproval.middleware");

router.post("/register", captainController.registerCaptain);
//router.post("/login", captainController.loginCaptain);

router.post(
    "/upload-documents",
    authMiddleware.authCaptain,
    upload.fields([
        { name: "drivingLicense", maxCount: 1 },
        { name: "vehicleRC", maxCount: 1 },
        { name: "aadhaar", maxCount: 1 },
        { name: "insurance", maxCount: 1 }
    ]),
    captainController.uploadDocuments
);


router.post("/send-otp", captainController.sendCaptainOtp);
router.post("/verify-otp", captainController.verifyCaptainOtp);
router.get("/profile", authMiddleware.authCaptain, captainController.getProfile);

router.patch(
    "/go-online",
    authMiddleware.authCaptain,
    captainApprovalMiddleware.requireApprovedCaptain,
    captainController.goOnline
);

router.patch(
    "/go-offline",
    authMiddleware.authCaptain,
    captainController.goOffline
);



router.patch(
    "/update-location",
    authMiddleware.authCaptain,
    captainApprovalMiddleware.requireApprovedCaptain,
    captainController.updateLocation
);



module.exports = router;