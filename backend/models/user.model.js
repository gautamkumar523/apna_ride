const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({

    name: {
        type: String,
        required: false,
    },

    email: {
        type: String,
        required: false,
        unique: true,
        sparse: true
    },

    mobile: {
        type: String,
        required: true,
        unique: true
    },

    otp: {
        type: String,
        default: null
    },

    otpExpires: {
        type: Date,
        default: null
    },

    otpVerified: {
        type: Boolean,
        default: false
    },

    // Permanent Ride PIN
    ridePin: {
        type: String,
        default: null
    },

    gender: {
        type: String,
        enum: ["male", "female", "other"],
        required: false
    },

    dob: {
        type: Date,
        default: null
    },

    // User ka APNA permanent referral code
    referralCode: {
        type: String,
        unique: true,
        sparse: true
    },

    // Optional:
    // User ne registration ke time kis referral code ko use kiya
    referredBy: {
        type: String,
        default: null
    },

    isRegistered: {
        type: Boolean,
        default: false
    }

});

module.exports = mongoose.model("User", userSchema);