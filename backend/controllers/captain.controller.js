const Captain = require("../models/captain.model");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

exports.registerCaptain = async (req, res) => {
    try {
        const {
    name,
    email,
    mobile,
    gender,
    ridePreference,
    color,
    plate,
    capacity,
    vehicleType
} = req.body;





if (!gender) {
    return res.status(400).json({
        message: "Captain gender is required"
    });
}

if (!["male", "female", "other"].includes(gender)) {
    return res.status(400).json({
        message: "Invalid captain gender"
    });
}

if (gender === "female" && !ridePreference) {
    return res.status(400).json({
        message: "Ride preference is required for female captain"
    });
}

if (
    ridePreference &&
    !["all", "female_only"].includes(ridePreference)
) {
    return res.status(400).json({
        message: "Invalid ride preference"
    });
}





        const captain = await Captain.create({
    name,
    email,
    mobile,

    gender,

    ridePreference:
        gender === "female"
            ? ridePreference
            : "all",

    vehicle: {
        color,
        plate,
        capacity,
        vehicleType
    }
});

        const captainData = captain.toObject();
       

        return res.status(201).json({
            message: "Captain Registered Successfully",
            captain: captainData
        });

    } catch (error) {
        console.log(error);

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};


exports.sendCaptainOtp = async (req, res) => {
    try {
        const { mobile } = req.body;

        const captain = await Captain.findOne({ mobile });

        if (!captain) {
            return res.status(404).json({
                message: "Captain Not Found"
            });
        }

        const otp = crypto.randomInt(100000, 999999).toString();

        captain.otp = otp;
        captain.otpExpires = Date.now() + 5 * 60 * 1000;

        await captain.save();

        return res.status(200).json({
            message: "OTP Generated Successfully",
            otp
        });

    } catch (error) {
        console.log(error);

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

exports.verifyCaptainOtp = async (req, res) => {
    try {
        const { mobile, otp } = req.body;

const captain = await Captain.findOne({ mobile });

if (!captain) {
    return res.status(404).json({
        message: "Captain Not Found"
    });
}

if (!captain.otpExpires || captain.otpExpires < Date.now()) {
    return res.status(400).json({
        message: "OTP Expired"
    });
}

if (captain.otp !== otp) {
    return res.status(400).json({
        message: "Invalid OTP"
    });
}

captain.otp = null;
captain.otpExpires = null;
await captain.save();

const secret = process.env.JWT_SECRET || "apnaride_secret_key";
const token = jwt.sign(
    {
        id: captain._id,
        mobile: captain.mobile
    },
    secret
);

return res.status(200).json({
    message: "OTP Verified Successfully",
    token,
    captain
});

} catch (error) {
        console.log(error);

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};


exports.uploadDocuments = async (req, res) => {
    try {

        const captain = await Captain.findById(req.captain.id);

        if (!captain) {
            return res.status(404).json({
                message: "Captain Not Found"
            });
        }

        if (req.files.drivingLicense) {
            captain.documents.drivingLicense =
                req.files.drivingLicense[0].path;
        }

        if (req.files.vehicleRC) {
            captain.documents.vehicleRC =
                req.files.vehicleRC[0].path;
        }

        if (req.files.aadhaar) {
            captain.documents.aadhaar =
                req.files.aadhaar[0].path;
        }

        if (req.files.insurance) {
            captain.documents.insurance =
                req.files.insurance[0].path;
        }

        captain.verificationStatus = "pending";

        await captain.save();

        return res.status(200).json({
            message: "Documents Uploaded Successfully",
            verificationStatus: captain.verificationStatus,
            documents: captain.documents
        });

    } catch (error) {
        console.log(error);

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};





// ==========================================
// CAPTAIN ONLINE
// ==========================================

exports.goOnline = async (req, res) => {
    try {

        const captain = await Captain.findById(req.captain.id);

        if (!captain) {
            return res.status(404).json({
                message: "Captain Not Found"
            });
        }

        captain.status = "online";

        await captain.save();

        return res.status(200).json({
            message: "Captain is now Online",
            status: captain.status
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};


// ==========================================
// CAPTAIN OFFLINE
// ==========================================

exports.goOffline = async (req, res) => {
    try {

        const captain = await Captain.findById(req.captain.id);

        if (!captain) {
            return res.status(404).json({
                message: "Captain Not Found"
            });
        }

        captain.status = "offline";

        await captain.save();

        return res.status(200).json({
            message: "Captain is now Offline",
            status: captain.status
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};





// ==========================================
// CAPTAIN LIVE LOCATION
// ==========================================

exports.updateLocation = async (req, res) => {
    try {

        const { lat, lng } = req.body;

        if (lat === undefined || lng === undefined) {
            return res.status(400).json({
                message: "Latitude and longitude are required"
            });
        }

        if (
            typeof lat !== "number" ||
            typeof lng !== "number"
        ) {
            return res.status(400).json({
                message: "Latitude and longitude must be numbers"
            });
        }

        const captain = await Captain.findById(req.captain.id);

        if (!captain) {
            return res.status(404).json({
                message: "Captain Not Found"
            });
        }

        captain.location.lat = lat;
        captain.location.lng = lng;

        await captain.save();

        return res.status(200).json({
            message: "Captain Location Updated Successfully",
            location: captain.location
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

// ==========================================
// GET CAPTAIN PROFILE
// ==========================================
exports.getProfile = async (req, res) => {
    try {
        const captain = await Captain.findById(req.captain._id || req.captain.id);
        if (!captain) {
            return res.status(404).json({ message: "Captain Not Found" });
        }
        return res.status(200).json({
            success: true,
            captain
        });
    } catch (error) {
        console.error("GET CAPTAIN PROFILE ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};