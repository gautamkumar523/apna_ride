const jwt = require("jsonwebtoken");
const Admin = require("../models/admin.model");

exports.authAdmin = async (req, res, next) => {
    try {

        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                message: "Admin Token Required"
            });
        }

        const parts = authHeader.split(" ");

        if (parts.length !== 2 || parts[0] !== "Bearer") {
            return res.status(401).json({
                message: "Invalid Authorization Format"
            });
        }

        const token = parts[1];

        const secret = process.env.JWT_SECRET || "apnaride_secret_key";
        const decoded = jwt.verify(token, secret);

        if (decoded.role !== "admin") {
            return res.status(403).json({
                message: "Admin Access Required"
            });
        }

        const admin = await Admin.findById(decoded.id);

        if (!admin) {
            return res.status(401).json({
                message: "Admin Not Found"
            });
        }

        req.admin = admin;

        next();

    } catch (error) {

        console.log(error);

        return res.status(401).json({
            message: "Invalid or Expired Admin Token"
        });
    }
};