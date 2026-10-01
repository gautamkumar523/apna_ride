console.log("USER ROUTES FILE LOADED");

const express = require("express");

const userController = require("../controllers/user.controller");

const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();


// Home
router.get("/", userController.home);


// Authentication
router.post("/send-otp", userController.sendOTP);

router.post("/verify-otp", userController.verifyOTP);

router.post("/register", userController.registerUser);


// Protected Profile
router.get(
    "/profile",
    authMiddleware.authUser,
    (req, res) => {

        res.json(req.user);

    }
);


module.exports = router;