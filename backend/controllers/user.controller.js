const User = require("../models/user.model");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "apnaride_secret_key";

exports.home = (req, res) => {
    res.send("User Controller Working Successfully");
};


// ==========================================
// SEND OTP
// ==========================================

exports.sendOTP = async (req, res) => {

    try {

        const { mobile } = req.body;

        if (!mobile) {
            return res.status(400).json({
                message: "Mobile number is required"
            });
        }

        let user = await User.findOne({ mobile });

        // ==========================================
        // NEW USER
        // ==========================================

        if (!user) {

            user = await User.create({
                mobile: mobile,
                isRegistered: false,
                otpVerified: false
            });

        }

        // ==========================================
        // GENERATE 6 DIGIT OTP
        // ==========================================

        const otp = Math.floor(
            100000 + Math.random() * 900000
        ).toString();

        // ==========================================
        // OTP VALID FOR 5 MINUTES
        // ==========================================

        user.otp = otp;

        user.otpExpires = new Date(
            Date.now() + 5 * 60 * 1000
        );

        user.otpVerified = false;

        await user.save();

        // Development ke time terminal me OTP dikhega
        console.log("APNA RIDE OTP:", otp);

        return res.status(200).json({

            message: "OTP sent successfully",

            otp: otp

        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            message: "Internal Server Error"
        });

    }

};


// ==========================================
// VERIFY OTP
// ==========================================

exports.verifyOTP = async (req, res) => {

    try {

        const { mobile, otp } = req.body;

        // ==========================================
        // REQUIRED CHECK
        // ==========================================

        if (!mobile || !otp) {

            return res.status(400).json({

                message:
                    "Mobile number and OTP are required"

            });

        }

        // ==========================================
        // FIND USER
        // ==========================================

        const user = await User.findOne({ mobile });

        if (!user) {

            return res.status(404).json({

                message: "User not found"

            });

        }

        // ==========================================
        // OTP EXPIRY CHECK
        // ==========================================

        if (
            !user.otpExpires ||
            user.otpExpires.getTime() < Date.now()
        ) {

            return res.status(400).json({

                message: "OTP expired"

            });

        }

        // ==========================================
        // WRONG OTP CHECK
        // ==========================================

        if (user.otp !== otp) {

            return res.status(400).json({

                message: "Invalid OTP"

            });

        }

        // ==========================================
        // OTP VERIFIED
        // ==========================================

        user.otp = null;

        user.otpExpires = null;

        user.otpVerified = true;

        await user.save();


        // ==========================================
        // EXISTING USER
        // ==========================================

        if (user.isRegistered === true) {

            const userData = user.toObject();

            delete userData.otp;
            delete userData.otpExpires;
            delete userData.otpVerified;


            // ==========================================
            // LOGIN TOKEN
            // ==========================================

            const token = jwt.sign(

                {
                    id: user._id,
                    mobile: user.mobile
                },

                JWT_SECRET

            );


            return res.status(200).json({

                message: "Login successful",

                isRegistered: true,

                token: token,

                user: userData

            });

        }


        // ==========================================
        // NEW USER
        // ==========================================

        return res.status(200).json({

            message:
                "OTP verified. Please complete registration.",

            isRegistered: false,

            mobile: user.mobile,

            nextStep: "registration"

        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({

            message: "Internal Server Error"

        });

    }

};


// ==========================================
// REGISTER USER
// ==========================================

exports.registerUser = async (req, res) => {

    try {

        const {

            name,
            mobile,
            gender,
            email,
            dob,
            referredBy

        } = req.body;


        // ==========================================
        // REQUIRED FIELDS
        // ==========================================

        if (!name || !mobile || !gender) {

            return res.status(400).json({

                message:
                    "Name, mobile number and gender are required"

            });

        }


        // ==========================================
        // FIND USER
        // ==========================================

        const user = await User.findOne({ mobile });

        if (!user) {

            return res.status(404).json({

                message:
                    "Please verify your mobile number with OTP first"

            });

        }


        // ==========================================
        // OTP CHECK
        // ==========================================

        if (user.otpVerified !== true) {

            return res.status(401).json({

                message:
                    "Please verify OTP before registration"

            });

        }


        // ==========================================
        // ALREADY REGISTERED
        // ==========================================

        if (user.isRegistered === true) {

            return res.status(409).json({

                message:
                    "An account already exists with this mobile number. Please login."

            });

        }


        // ==========================================
        // CREATE PERMANENT RIDE PIN
        // ==========================================

        const ridePin = Math.floor(

            1000 + Math.random() * 9000

        ).toString();


        // ==========================================
        // CREATE PERMANENT REFERRAL CODE
        // ==========================================

        const referralCode =
            "APNA" +
            user._id.toString()
                .slice(-6)
                .toUpperCase();


        // ==========================================
        // SAVE USER
        // ==========================================

        user.name = name;

        user.gender = gender;


        // ==========================================
        // OPTIONAL FIELDS
        // ==========================================

       if (email) {
    user.email = email;
} else {
    user.email = undefined;
}

user.dob = dob || null;



        // ==========================================
        // OPTIONAL REFERRAL
        // ==========================================

        user.referredBy = referredBy || null;


        // ==========================================
        // USER'S OWN PERMANENT REFERRAL CODE
        // ==========================================

        user.referralCode = referralCode;


        // ==========================================
        // PERMANENT RIDE PIN
        // ==========================================

        user.ridePin = ridePin;


        // ==========================================
        // REGISTER USER
        // ==========================================

        user.isRegistered = true;

        user.otpVerified = false;


        await user.save();


        // ==========================================
        // CREATE LOGIN TOKEN
        // ==========================================

        const token = jwt.sign(

            {
                id: user._id,
                mobile: user.mobile
            },

            JWT_SECRET

        );


        // ==========================================
        // RESPONSE USER DATA
        // ==========================================

        const userData = user.toObject();

        delete userData.otp;

        delete userData.otpExpires;

        delete userData.otpVerified;


        // ==========================================
        // REGISTRATION RESPONSE
        // ==========================================

        return res.status(201).json({

            message:
                "Registration successful. Welcome to Apna Ride.",

            isRegistered: true,

            token: token,

            user: userData

        });


    } catch (error) {

        console.log(error);

        return res.status(500).json({

            message: "Internal Server Error"

        });

    }

};