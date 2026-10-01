const mongoose = require("mongoose");

const rideSchema = new mongoose.Schema({

    // ==========================================
    // USER
    // ==========================================

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    // ==========================================
    // CAPTAIN
    // ==========================================

    captain: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Captain",
        default: null
    },

    // ==========================================
    // CURRENT CAPTAIN OFFER
    // Only this captain may accept/reject the current offer.
    // ==========================================

    offeredCaptain: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Captain",
        default: null
    },

    // ==========================================
    // REJECTED CAPTAINS
    // ==========================================

    rejectedCaptains: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Captain"
    }],

    // ==========================================
    // PICKUP LOCATION
    // ==========================================

    pickup: {
        address: {
            type: String,
            required: true
        },
        lat: {
            type: Number,
            required: true
        },
        lng: {
            type: Number,
            required: true
        }
    },

    // ==========================================
    // DROP LOCATION
    // ==========================================

    drop: {
        address: {
            type: String,
            required: true
        },
        lat: {
            type: Number,
            required: true
        },
        lng: {
            type: Number,
            required: true
        }
    },

    // ==========================================
    // RIDE DETAILS
    // ==========================================

    vehicleType: {
        type: String,
        enum: ["bike", "auto", "car"],
        required: true
    },

    captainPreference: {
        type: String,
        enum: ["all", "female_only"],
        default: "all"
    },

    distance: {
        type: Number,
        default: 0
    },

    estimatedFare: {
        type: Number,
        default: 0
    },

    finalFare: {
        type: Number,
        default: 0
    },

    // ==========================================
    // RIDE STATUS
    // ==========================================

    status: {
        type: String,
        enum: [
            "requested",
            "accepted",
            "captain_arrived",
            "started",
            "completed",
            "cancelled"
        ],
        default: "requested"
    },

    // ==========================================
    // RIDE PIN
    // ==========================================

    ridePin: {
        type: String,
        default: null
    },

    ridePinVerified: {
        type: Boolean,
        default: false
    },

    // ==========================================
    // TIMESTAMPS
    // ==========================================

    requestedAt: {
        type: Date,
        default: Date.now
    },

    acceptedAt: {
        type: Date,
        default: null
    },

    startedAt: {
        type: Date,
        default: null
    },

    arrivedAt: {
        type: Date,
        default: null
    },

    cancelledAt: {
        type: Date,
        default: null
    },

    cancelledBy: {
        type: String,
        enum: ["user", "captain", "admin", null],
        default: null
    },

    cancellationReason: {
        type: String,
        default: null
    }

});

module.exports = mongoose.model("Ride", rideSchema);
