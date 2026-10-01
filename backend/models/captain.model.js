const mongoose = require("mongoose");

const captainSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true,
        unique: true
    },

    mobile: {
        type: String,
        required: true,
        unique: true
    },

     gender: {
        type: String,
        enum: ["male", "female", "other"],
        required: false
    },

    ridePreference: {
        type: String,
        enum: ["all", "female_only"],
        default: "all"
    },

   
    vehicle: {
        color: {
            type: String,
            required: true
        },

        plate: {
            type: String,
            required: true,
            unique: true
        },

        capacity: {
            type: Number,
            required: true
        },

        vehicleType: {
            type: String,
            enum: ["bike", "auto", "car"],
            required: true
        }
    },

    location: {
        lat: {
            type: Number,
            default: null
        },

        lng: {
            type: Number,
            default: null
        }
    },

    status: {
        type: String,
        enum: ["offline", "online"],
        default: "offline"
    },


documents: {
    drivingLicense: {
        type: String,
        default: null
    },

    vehicleRC: {
        type: String,
        default: null
    },

    aadhaar: {
        type: String,
        default: null
    },

    insurance: {
        type: String,
        default: null
    }
},

verificationStatus: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
},


rejectionReason: {
    type: String,
    default: null
},


    
    otp: {
    type: String,
    default: null
},
otpExpires: {
    type: Number,
    default: null
}


});

module.exports = mongoose.model("Captain", captainSchema);