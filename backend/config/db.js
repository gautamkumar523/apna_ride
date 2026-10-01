const mongoose = require("mongoose");

const connectToDb = async () => {
    try {
        const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/apna_ride";
        await mongoose.connect(uri);

        console.log("MongoDB Connected Successfully to:", uri);
    } catch (err) {
        console.error("MongoDB Connection Error:", err);
    }
};

module.exports = connectToDb;