const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const readline = require("readline");

const Admin = require("./models/admin.model");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (text) => {
    return new Promise((resolve) => {
        rl.question(text, resolve);
    });
};

async function createAdmin() {
    try {

        await mongoose.connect(
            "mongodb://127.0.0.1:27017/apna_ride"
        );

        console.log("MongoDB Connected");

        const name = await question("Admin Name: ");
        const email = await question("Admin Email: ");
        const password = await question("Admin Password: ");

        const existingAdmin = await Admin.findOne({ email });

        if (existingAdmin) {
            console.log("Admin with this email already exists.");
            rl.close();
            await mongoose.connection.close();
            return;
        }

        const hashedPassword = await bcrypt.hash(
            password,
            10
        );

        const admin = await Admin.create({
            name,
            email,
            password: hashedPassword,
            role: "admin"
        });

        console.log("Admin Created Successfully");
        console.log("Admin ID:", admin._id.toString());
        console.log("Email:", admin.email);
        console.log("Role:", admin.role);

        rl.close();
        await mongoose.connection.close();

    } catch (error) {

        console.log("Admin Creation Error:");
        console.log(error);

        rl.close();
        await mongoose.connection.close();
    }
}

createAdmin();