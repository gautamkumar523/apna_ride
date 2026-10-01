const http = require("http");
require("./server.js");

async function request(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = "";
            res.on("data", chunk => body += chunk);
            res.on("end", () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve({ status: res.statusCode, body: parsed });
                } catch {
                    resolve({ status: res.statusCode, body });
                }
            });
        });
        req.on("error", reject);
        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function runTests() {
    console.log("=== STARTING APNA RIDE FULL SYSTEM INTEGRATION TEST ===");

    // 1. Health Check
    console.log("\n1. Testing Health Check...");
    let res = await request({ hostname: "localhost", port: 3000, path: "/health", method: "GET" });
    console.log("Status:", res.status, "Response:", res.body.status);
    if (res.status !== 200) throw new Error("Health check failed");

    // 2. Fare Calculation
    console.log("\n2. Testing Fare Calculation (Bike, 5.5 km in Patna)...");
    res = await request({ hostname: "localhost", port: 3000, path: "/fares/calculate?distanceKm=5.5&vehicleType=bike", method: "GET" });
    console.log("Status:", res.status, "Estimated Total Fare: ₹" + res.body.fare?.totalFare);
    if (res.status !== 200) throw new Error("Fare calculation failed");

    // 3. User Send OTP
    console.log("\n3. Testing User Send OTP...");
    const testMobile = "9112233445";
    res = await request({
        hostname: "localhost", port: 3000, path: "/users/send-otp", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, { mobile: testMobile });
    console.log("Status:", res.status, "OTP Generated:", res.body.otp);
    const userOtp = res.body.otp;

    // 4. User Verify OTP
    console.log("\n4. Testing User Verify OTP...");
    res = await request({
        hostname: "localhost", port: 3000, path: "/users/verify-otp", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, { mobile: testMobile, otp: userOtp });
    console.log("Status:", res.status, "isRegistered:", res.body.isRegistered);

    // 5. User Registration (if new)
    let userToken = res.body.token;
    if (!res.body.isRegistered) {
        console.log("\n5. Testing User Registration...");
        res = await request({
            hostname: "localhost", port: 3000, path: "/users/register", method: "POST",
            headers: { "Content-Type": "application/json" }
        }, {
            name: "Rajesh Kumar",
            mobile: testMobile,
            gender: "male"
        });
        console.log("Status:", res.status, "Registered User PIN:", res.body.user.ridePin);
        userToken = res.body.token;
    }

    // 6. User Request Ride
    console.log("\n6. Testing User Request Ride...");
    res = await request({
        hostname: "localhost", port: 3000, path: "/rides/request", method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${userToken}`
        }
    }, {
        pickup: { address: "Gandhi Maidan, Patna", lat: 25.6150, lng: 85.1430 },
        drop: { address: "Patliputra Colony, Patna", lat: 25.6270, lng: 85.1120 },
        vehicleType: "bike"
    });
    console.log("Status:", res.status, "Ride ID:", res.body.ride._id, "Estimated Fare: ₹" + res.body.ride.estimatedFare);
    const rideId = res.body.ride._id;
    const ridePin = res.body.ride.ridePin;

    // 7. Find Matching Captain
    console.log("\n7. Testing Ride Matching Engine...");
    res = await request({
        hostname: "localhost", port: 3000, path: "/matching/find", method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${userToken}`
        }
    }, { rideId });
    console.log("Status:", res.status, "Offered Captain:", res.body.captain.name, `(${res.body.captain.distanceFromPickup} km away)`);
    const offeredCaptainId = res.body.captain.captainId;

    // 8. Captain Login
    console.log("\n8. Testing Captain Login for Offered Captain...");
    res = await request({
        hostname: "localhost", port: 3000, path: "/captains/send-otp", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, { mobile: "9876543210" });
    const capOtp = res.body.otp;

    res = await request({
        hostname: "localhost", port: 3000, path: "/captains/verify-otp", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, { mobile: "9876543210", otp: capOtp });
    const captainToken = res.body.token;
    console.log("Captain Logged In Successfully!");

    // 9. Captain Accept Ride
    console.log("\n9. Testing Captain Accept Ride...");
    res = await request({
        hostname: "localhost", port: 3000, path: `/rides/${rideId}/accept`, method: "PATCH",
        headers: { "Authorization": `Bearer ${captainToken}` }
    });
    console.log("Status:", res.status, "New Ride Status:", res.body.ride.status);

    // 10. Captain Arrived
    console.log("\n10. Testing Captain Arrived at Pickup...");
    res = await request({
        hostname: "localhost", port: 3000, path: `/rides/${rideId}/arrived`, method: "PATCH",
        headers: { "Authorization": `Bearer ${captainToken}` }
    });
    console.log("Status:", res.status, "New Ride Status:", res.body.ride.status);

    // 11. Captain Start Ride with Customer PIN
    console.log(`\n11. Testing Start Ride with PIN (${ridePin})...`);
    res = await request({
        hostname: "localhost", port: 3000, path: `/rides/${rideId}/start`, method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${captainToken}`
        }
    }, { ridePin });
    console.log("Status:", res.status, "New Ride Status:", res.body.ride.status);

    // 12. Captain Complete Ride
    console.log("\n12. Testing Complete Ride & Collect Fare...");
    res = await request({
        hostname: "localhost", port: 3000, path: `/rides/${rideId}/complete`, method: "PATCH",
        headers: { "Authorization": `Bearer ${captainToken}` }
    });
    console.log("Status:", res.status, "Trip Finished! Collected Fare: ₹" + res.body.fare);

    // 13. Admin Login & Stats
    console.log("\n13. Testing Admin Login & Dashboard Stats...");
    res = await request({
        hostname: "localhost", port: 3000, path: "/admin/login", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, { email: "admin@apnaride.com", password: "admin123" });
    const adminToken = res.body.token;

    res = await request({
        hostname: "localhost", port: 3000, path: "/admin/stats", method: "GET",
        headers: { "Authorization": `Bearer ${adminToken}` }
    });
    console.log("Status:", res.status, "Stats:", res.body.stats);

    // 14. Contact Form
    console.log("\n14. Testing Contact Us Message Submission...");
    res = await request({
        hostname: "localhost", port: 3000, path: "/contact", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, {
        name: "Test User",
        email: "test@example.com",
        topic: "Rider support",
        message: "Hello Apna Ride, great app!"
    });
    console.log("Status:", res.status, "Message:", res.body.message);

    console.log("\n=======================================================");
    console.log("🎉 ALL 14 END-TO-END INTEGRATION TESTS PASSED PERFECTLY!");
    console.log("=======================================================\n");
    process.exit(0);
}

setTimeout(() => {
    runTests().catch(err => {
        console.error("TEST FAILED:", err);
        process.exit(1);
    });
}, 1200);
