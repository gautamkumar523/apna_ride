const Captain = require("../models/captain.model");
const Admin = require("../models/admin.model");
const Ride = require("../models/ride.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.getPendingCaptains = async (req, res) => {
    try {
        const captains = await Captain.find({
            verificationStatus: "pending"
        }).sort({ _id: -1 });

        return res.status(200).json({
            message: "Pending Captains Fetched Successfully",
            captains
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

exports.getAllCaptains = async (req, res) => {
    try {
        const { status } = req.query;
        const query = status ? { verificationStatus: status } : {};
        const captains = await Captain.find(query).sort({ _id: -1 });

        return res.status(200).json({
            success: true,
            captains
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

exports.approveCaptain = async (req, res) => {
    try {
        const captain = await Captain.findById(req.params.id);

        if (!captain) {
            return res.status(404).json({
                message: "Captain not found"
            });
        }

        captain.verificationStatus = "approved";
        captain.rejectionReason = null;
        await captain.save();

        return res.status(200).json({
            message: "Captain Approved Successfully",
            captain
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

exports.rejectCaptain = async (req, res) => {
    try {
        const { rejectionReason } = req.body;

        if (!rejectionReason) {
            return res.status(400).json({
                message: "Rejection reason is required"
            });
        }

        const captain = await Captain.findById(req.params.id);

        if (!captain) {
            return res.status(404).json({
                message: "Captain not found"
            });
        }

        captain.verificationStatus = "rejected";
        captain.rejectionReason = rejectionReason;
        await captain.save();

        return res.status(200).json({
            message: "Captain Rejected Successfully",
            captain
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

exports.getAllRides = async (req, res) => {
    try {
        const rides = await Ride.find({})
            .sort({ requestedAt: -1 })
            .limit(100)
            .populate("user", "name mobile")
            .populate("captain", "name mobile vehicle");

        return res.status(200).json({
            success: true,
            rides
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

exports.getDashboardStats = async (req, res) => {
    try {
        const [totalCaptains, pendingCaptains, approvedCaptains, totalRides, activeRides] = await Promise.all([
            Captain.countDocuments({}),
            Captain.countDocuments({ verificationStatus: "pending" }),
            Captain.countDocuments({ verificationStatus: "approved" }),
            Ride.countDocuments({}),
            Ride.countDocuments({ status: { $in: ["requested", "accepted", "captain_arrived", "started"] } })
        ]);

        return res.status(200).json({
            success: true,
            stats: {
                totalCaptains,
                pendingCaptains,
                approvedCaptains,
                totalRides,
                activeRides
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// ==========================================
// ADMIN LOGIN
// ==========================================
exports.loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const admin = await Admin.findOne({ email });

        if (!admin) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            admin.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const secret = process.env.JWT_SECRET || "apnaride_secret_key";
        const token = jwt.sign(
            {
                id: admin._id,
                email: admin.email,
                role: admin.role
            },
            secret
        );

        return res.status(200).json({
            message: "Admin Login Successful",
            token,
            admin: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role
            }
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};