const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const Captain = require("../models/captain.model");

exports.authUser = async (req, res, next) => {
    console.log("AUTH MIDDLEWARE RUNNING");
    try {

        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const secret = process.env.JWT_SECRET || "apnaride_secret_key";
        const decoded = jwt.verify(token, secret);

const user = await User.findById(decoded.id).select("-password").select("-__v");
console.log("USER FROM DB:", user);

if (!user) {
    return res.status(404).json({
        message: "User not found"
    });
}

req.user = user;

next();

    } catch (error) {
        console.log(error);
        return res.status(401).json({
            message: "Invalid Token"
        });
    }
};





exports.authCaptain = async (req, res, next) => {
    try {

        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const secret = process.env.JWT_SECRET || "apnaride_secret_key";
        const decoded = jwt.verify(token, secret);

        const captain = await Captain.findById(decoded.id);

        if (!captain) {
            return res.status(404).json({
                message: "Captain Not Found"
            });
        }

        req.captain = captain;

        next();

    } catch (error) {
        console.log(error);

        return res.status(401).json({
            message: "Invalid Token"
        });
    }
};

exports.authUserOrCaptain = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const token = authHeader.split(" ")[1];
        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const secret = process.env.JWT_SECRET || "apnaride_secret_key";
        const decoded = jwt.verify(token, secret);

        const user = await User.findById(decoded.id);
        if (user) {
            req.user = user;
            return next();
        }

        const captain = await Captain.findById(decoded.id);
        if (captain) {
            req.captain = captain;
            return next();
        }

        return res.status(401).json({ message: "Account not found" });
    } catch (error) {
        return res.status(401).json({ message: "Invalid Token" });
    }
};