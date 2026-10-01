require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const Admin = require("./models/admin.model");
const Captain = require("./models/captain.model");

async function seedData() {
    try {
        const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/apna_ride";
        await mongoose.connect(uri);
        console.log("Connected to MongoDB for seeding...");

        // 1. Seed Admin
        const existingAdmin = await Admin.findOne({ email: "admin@apnaride.com" });
        if (!existingAdmin) {
            const hashedPassword = await bcrypt.hash("admin123", 10);
            await Admin.create({
                name: "Apna Ride Admin",
                email: "admin@apnaride.com",
                password: hashedPassword,
                role: "admin"
            });
            console.log("Admin account created: admin@apnaride.com / admin123");
        } else {
            console.log("Admin account already exists: admin@apnaride.com");
        }

        // 2. Seed Sample Captains for testing matching & live rides
        const sampleCaptains = [
            {
                name: "Rahul Kumar (Patna Bike)",
                email: "rahul.patna@apnaride.com",
                mobile: "9876543210",
                gender: "male",
                ridePreference: "all",
                vehicle: {
                    color: "Black",
                    plate: "BR 01 AB 1234",
                    capacity: 1,
                    vehicleType: "bike"
                },
                location: {
                    lat: 25.6093, // Patna center
                    lng: 85.1376
                },
                status: "online",
                verificationStatus: "approved"
            },
            {
                name: "Priya Kumari (Patna Women Captain)",
                email: "priya.patna@apnaride.com",
                mobile: "9876543211",
                gender: "female",
                ridePreference: "female_only",
                vehicle: {
                    color: "Red",
                    plate: "BR 01 CD 5678",
                    capacity: 1,
                    vehicleType: "bike"
                },
                location: {
                    lat: 25.6120, // Patliputra / Boring Road area
                    lng: 85.1250
                },
                status: "online",
                verificationStatus: "approved"
            },
            {
                name: "Ramesh Prasad (Patna Auto)",
                email: "ramesh.auto@apnaride.com",
                mobile: "9876543212",
                gender: "male",
                ridePreference: "all",
                vehicle: {
                    color: "Yellow-Green",
                    plate: "BR 01 EF 9012",
                    capacity: 3,
                    vehicleType: "auto"
                },
                location: {
                    lat: 25.6020,
                    lng: 85.1450
                },
                status: "online",
                verificationStatus: "approved"
            },
            {
                name: "Manoj Singh (Patna Cab)",
                email: "manoj.cab@apnaride.com",
                mobile: "9876543213",
                gender: "male",
                ridePreference: "all",
                vehicle: {
                    color: "White",
                    plate: "BR 01 GH 3456",
                    capacity: 4,
                    vehicleType: "car"
                },
                location: {
                    lat: 25.5941,
                    lng: 85.1376
                },
                status: "online",
                verificationStatus: "approved"
            },
            {
                name: "Suresh Yadav (Bettiah Bike)",
                email: "suresh.bettiah@apnaride.com",
                mobile: "9876543214",
                gender: "male",
                ridePreference: "all",
                vehicle: {
                    color: "Blue",
                    plate: "BR 22 JK 7890",
                    capacity: 1,
                    vehicleType: "bike"
                },
                location: {
                    lat: 26.8020,
                    lng: 84.5037
                },
                status: "online",
                verificationStatus: "approved"
            },
            {
                name: "Anand Verma (Motihari Auto)",
                email: "anand.motihari@apnaride.com",
                mobile: "9876543215",
                gender: "male",
                ridePreference: "all",
                vehicle: {
                    color: "Green",
                    plate: "BR 05 LM 2345",
                    capacity: 3,
                    vehicleType: "auto"
                },
                location: {
                    lat: 26.6467,
                    lng: 84.9126
                },
                status: "online",
                verificationStatus: "approved"
            }
        ];

        for (const cap of sampleCaptains) {
            const exists = await Captain.findOne({ mobile: cap.mobile });
            if (!exists) {
                await Captain.create(cap);
                console.log(`Created Captain: ${cap.name} (${cap.vehicle.vehicleType})`);
            }
        }

        console.log("Seeding completed successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Seeding error:", err);
        process.exit(1);
    }
}

seedData();
