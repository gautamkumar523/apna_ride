require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const express = require("express");
const path = require("path");
const cors = require("cors");
const connectToDb = require("./config/db");

const userRoutes = require("./routes/user.routes");
const captainRoutes = require("./routes/captain.routes");
const adminRoutes = require("./routes/admin.routes");
const rideRoutes = require("./routes/ride.routes");
const locationRoutes = require("./routes/location.routes");
const routeRoutes = require("./routes/route.routes");
const fareRoutes = require("./routes/fare.routes");
const matchingRoutes = require("./routes/matching.routes");

const app = express();

// Database connection
connectToDb();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (uploads and root frontend)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "..")));

// API Routes
app.use("/users", userRoutes);
app.use("/captains", captainRoutes);
app.use("/admin", adminRoutes);
app.use("/rides", rideRoutes);
app.use("/locations", locationRoutes);
app.use("/routes", routeRoutes);
app.use("/fares", fareRoutes);
app.use("/matching", matchingRoutes);

// Contact message endpoint
const Contact = require("./models/contact.model");
app.post("/contact", async (req, res) => {
    try {
        const { name, email, topic, message } = req.body;
        if (!name || !email || !message) {
            return res.status(400).json({ success: false, message: "Name, email and message are required" });
        }
        const inquiry = await Contact.create({ name, email, topic, message });
        return res.status(201).json({
            success: true,
            message: "Thank you for reaching out! Our team will get back to you shortly.",
            inquiry
        });
    } catch (err) {
        console.error("Contact submission error:", err);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

// Health check
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        platform: "Apna Ride API",
        time: new Date().toISOString()
    });
});

// Serve Home
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "index.html"));
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("GLOBAL SERVER ERROR:", err);

    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal Server Error"
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Apna Ride Server Started on http://localhost:${PORT}`);
});