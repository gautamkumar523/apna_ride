const mongoose = require("mongoose");
const Ride = require("../models/ride.model");
const Captain = require("../models/captain.model");
const User = require("../models/user.model");
const fareConfig = require("../config/fare.config");

const MATCHING_RADIUS_KM = 20;

// ==========================================
// DISTANCE BETWEEN TWO LOCATIONS
// ==========================================

function calculateDistance(lat1, lng1, lat2, lng2) {

    const R = 6371;

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

function isWithinMatchingRadius(ride, captain) {
    if (
        !captain.location ||
        typeof captain.location.lat !== "number" ||
        typeof captain.location.lng !== "number"
    ) {
        return false;
    }

    return calculateDistance(
        ride.pickup.lat,
        ride.pickup.lng,
        captain.location.lat,
        captain.location.lng
    ) <= MATCHING_RADIUS_KM;
}

// ==========================================
// REQUEST RIDE
// ==========================================

exports.requestRide = async (req, res) => {
    try {

        const {
            pickup,
            drop,
            vehicleType,
            captainPreference
        } = req.body;

        // ==========================================
        // BASIC VALIDATION
        // ==========================================

        if (!pickup || !drop || !vehicleType) {
            return res.status(400).json({
                message: "Pickup, drop and vehicle type are required"
            });
        }

        // ==========================================
        // PICKUP VALIDATION
        // ==========================================

        if (
            !pickup.address ||
            pickup.lat === undefined ||
            pickup.lng === undefined
        ) {
            return res.status(400).json({
                message: "Complete pickup location is required"
            });
        }

        if (
            typeof pickup.lat !== "number" ||
            typeof pickup.lng !== "number"
        ) {
            return res.status(400).json({
                message: "Pickup latitude and longitude must be numbers"
            });
        }

        if (
            pickup.lat < -90 || pickup.lat > 90 ||
            pickup.lng < -180 || pickup.lng > 180
        ) {
            return res.status(400).json({
                message: "Invalid pickup coordinates"
            });
        }

        // ==========================================
        // DROP VALIDATION
        // ==========================================

        if (
            !drop.address ||
            drop.lat === undefined ||
            drop.lng === undefined
        ) {
            return res.status(400).json({
                message: "Complete drop location is required"
            });
        }

        if (
            typeof drop.lat !== "number" ||
            typeof drop.lng !== "number"
        ) {
            return res.status(400).json({
                message: "Drop latitude and longitude must be numbers"
            });
        }

        if (
            drop.lat < -90 || drop.lat > 90 ||
            drop.lng < -180 || drop.lng > 180
        ) {
            return res.status(400).json({
                message: "Invalid drop coordinates"
            });
        }

        // ==========================================
        // VEHICLE TYPE VALIDATION
        // ==========================================

        if (!["bike", "auto", "car"].includes(vehicleType)) {
            return res.status(400).json({
                message: "Invalid vehicle type"
            });
        }

        // ==========================================
        // USER
        // ==========================================

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                message: "User Not Found"
            });
        }

        // ==========================================
        // CAPTAIN PREFERENCE
        // ==========================================

        let finalCaptainPreference = "all";

        // Only female customers may request female-only captains.
        if (user.gender !== "female") {
            finalCaptainPreference = "all";
        } else {
            if (
                captainPreference !== undefined &&
                !["all", "female_only"].includes(captainPreference)
            ) {
                return res.status(400).json({
                    message: "Invalid captain preference"
                });
            }

            finalCaptainPreference = captainPreference || "all";
        }

        // ==========================================
        // DISTANCE & FARE ESTIMATE
        // ==========================================

        const straightKm = calculateDistance(pickup.lat, pickup.lng, drop.lat, drop.lng);
        const distanceKm = Number((straightKm * 1.25).toFixed(2));

        const vehicleRates = (fareConfig.general && fareConfig.general[vehicleType]) || {
            baseFare: 30,
            includedKm: 2,
            perKm: 9
        };

        let estimatedFare = vehicleRates.baseFare;
        if (distanceKm > vehicleRates.includedKm) {
            estimatedFare += (distanceKm - vehicleRates.includedKm) * vehicleRates.perKm;
        }
        estimatedFare = Math.max(vehicleRates.baseFare, Math.round(estimatedFare));

        const ridePin = (user.ridePin && user.ridePin.length === 4)
            ? user.ridePin
            : Math.floor(1000 + Math.random() * 9000).toString();

        // ==========================================
        // CREATE RIDE
        // ==========================================

        const ride = await Ride.create({

            user: req.user._id,

            pickup: {
                address: pickup.address,
                lat: pickup.lat,
                lng: pickup.lng
            },

            drop: {
                address: drop.address,
                lat: drop.lat,
                lng: drop.lng
            },

            vehicleType,
            captainPreference: finalCaptainPreference,
            distance: distanceKm,
            estimatedFare: estimatedFare,
            finalFare: estimatedFare,
            ridePin: ridePin,
            status: "requested"
        });

        return res.status(201).json({
            success: true,
            message: "Ride Requested Successfully",
            ride
        });

    } catch (error) {

        console.log("RIDE REQUEST ERROR:");
        console.log(error);

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

// ==========================================
// ACCEPT RIDE
// ==========================================

exports.acceptRide = async (req, res) => {
    try {

        const { rideId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(rideId)) {
            return res.status(400).json({
                message: "Invalid Ride ID"
            });
        }

        const captain = await Captain.findById(req.captain._id);

        if (!captain) {
            return res.status(404).json({
                message: "Captain Not Found"
            });
        }

        if (captain.status !== "online") {
            return res.status(400).json({
                message: "Captain must be online to accept a ride"
            });
        }

        if (captain.verificationStatus !== "approved") {
            return res.status(403).json({
                message: "Captain is not approved"
            });
        }

        const ride = await Ride.findById(rideId);

        if (!ride) {
            return res.status(404).json({
                message: "Ride Not Found"
            });
        }

        if (ride.status !== "requested" || ride.captain !== null) {
            return res.status(400).json({
                message: "Ride is no longer available"
            });
        }

        // Only the currently offered captain can accept.
        if (
            !ride.offeredCaptain ||
            ride.offeredCaptain.toString() !== captain._id.toString()
        ) {
            return res.status(403).json({
                message: "This ride is not currently offered to you"
            });
        }

        if (
            !captain.vehicle ||
            captain.vehicle.vehicleType !== ride.vehicleType
        ) {
            return res.status(400).json({
                message: "Captain vehicle type does not match this ride"
            });
        }

        if (!isWithinMatchingRadius(ride, captain)) {
            return res.status(400).json({
                message: "Captain is outside the 20 km ride matching range"
            });
        }

        if (ride.captainPreference === "female_only" && captain.gender !== "female") {
            return res.status(403).json({
                message: "This ride is available only for female captains"
            });
        }

        // Captain preference is also enforced at final acceptance.
        if (captain.ridePreference === "female_only") {
            const user = await User.findById(ride.user);

            if (!user) {
                return res.status(404).json({
                    message: "User Not Found"
                });
            }

            if (user.gender !== "female") {
                return res.status(403).json({
                    message: "Captain accepts only female customers"
                });
            }
        }

        // Atomic acceptance prevents two captains from accepting the same ride.
        const acceptedRide = await Ride.findOneAndUpdate(
            {
                _id: rideId,
                status: "requested",
                captain: null,
                offeredCaptain: captain._id
            },
            {
                $set: {
                    captain: captain._id,
                    offeredCaptain: null,
                    status: "accepted",
                    acceptedAt: new Date()
                }
            },
            { new: true }
        );

        if (!acceptedRide) {
            return res.status(400).json({
                message: "Ride is no longer available"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Ride Accepted Successfully",
            ride: acceptedRide
        });

    } catch (error) {

        console.log("ACCEPT RIDE ERROR:");
        console.log(error);

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

// ==========================================
// REJECT RIDE
// ==========================================

exports.rejectRide = async (req, res) => {
    try {

        const { rideId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(rideId)) {
            return res.status(400).json({
                message: "Invalid Ride ID"
            });
        }

        const captain = await Captain.findById(req.captain._id);

        if (!captain) {
            return res.status(404).json({
                message: "Captain Not Found"
            });
        }

        if (captain.status !== "online") {
            return res.status(400).json({
                message: "Captain must be online to reject a ride"
            });
        }

        if (captain.verificationStatus !== "approved") {
            return res.status(403).json({
                message: "Captain is not approved"
            });
        }

        const ride = await Ride.findOne({
            _id: rideId,
            status: "requested",
            captain: null,
            offeredCaptain: captain._id
        });

        if (!ride) {
            return res.status(400).json({
                message: "Ride is no longer available or is not offered to you"
            });
        }

        if (
            !captain.vehicle ||
            captain.vehicle.vehicleType !== ride.vehicleType
        ) {
            return res.status(400).json({
                message: "Captain vehicle type does not match this ride"
            });
        }

        if (!isWithinMatchingRadius(ride, captain)) {
            return res.status(400).json({
                message: "Captain is outside the 20 km ride matching range"
            });
        }

        if (ride.captainPreference === "female_only" && captain.gender !== "female") {
            return res.status(403).json({
                message: "This ride is available only for female captains"
            });
        }

        if (captain.ridePreference === "female_only") {
            const user = await User.findById(ride.user);

            if (!user) {
                return res.status(404).json({
                    message: "User Not Found"
                });
            }

            if (user.gender !== "female") {
                return res.status(403).json({
                    message: "Captain accepts only female customers"
                });
            }
        }

        // Atomic reject: remove current offer and remember this captain.
        const rejectedRide = await Ride.findOneAndUpdate(
            {
                _id: rideId,
                status: "requested",
                captain: null,
                offeredCaptain: captain._id
            },
            {
                $addToSet: {
                    rejectedCaptains: captain._id
                },
                $set: {
                    offeredCaptain: null
                }
            },
            { new: true }
        );

        if (!rejectedRide) {
            return res.status(400).json({
                message: "Ride is no longer available"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Ride rejected successfully",
            rideId: rejectedRide._id,
            rejectedCaptain: captain._id,
            nextAction: "Find the next nearest eligible captain"
        });

    } catch (error) {

        console.log("REJECT RIDE ERROR:");
        console.log(error);

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

// ==========================================
// CAPTAIN ARRIVED AT PICKUP
// ==========================================
exports.captainArrived = async (req, res) => {
    try {
        const { rideId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(rideId)) {
            return res.status(400).json({ message: "Invalid Ride ID" });
        }

        const ride = await Ride.findOne({
            _id: rideId,
            captain: req.captain._id,
            status: "accepted"
        });

        if (!ride) {
            return res.status(400).json({
                message: "Ride not found or not in accepted state"
            });
        }

        ride.status = "captain_arrived";
        ride.arrivedAt = new Date();
        await ride.save();

        return res.status(200).json({
            success: true,
            message: "Captain has arrived at pickup location",
            ride
        });
    } catch (error) {
        console.error("CAPTAIN ARRIVED ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// ==========================================
// START RIDE (VERIFY PIN)
// ==========================================
exports.startRide = async (req, res) => {
    try {
        const { rideId } = req.params;
        const { ridePin } = req.body;

        if (!mongoose.Types.ObjectId.isValid(rideId)) {
            return res.status(400).json({ message: "Invalid Ride ID" });
        }

        if (!ridePin) {
            return res.status(400).json({ message: "Ride PIN is required to start the ride" });
        }

        const ride = await Ride.findOne({
            _id: rideId,
            captain: req.captain._id
        });

        if (!ride) {
            return res.status(404).json({ message: "Ride not found" });
        }

        if (!["accepted", "captain_arrived"].includes(ride.status)) {
            return res.status(400).json({ message: "Ride cannot be started in current status: " + ride.status });
        }

        const user = await User.findById(ride.user);
        const correctPin = ride.ridePin || (user && user.ridePin);

        if (correctPin && ridePin.toString().trim() !== correctPin.toString().trim()) {
            return res.status(400).json({ message: "Invalid Ride PIN. Please check with customer." });
        }

        ride.status = "started";
        ride.ridePinVerified = true;
        ride.startedAt = new Date();
        await ride.save();

        return res.status(200).json({
            success: true,
            message: "Ride started successfully",
            ride
        });
    } catch (error) {
        console.error("START RIDE ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// ==========================================
// COMPLETE RIDE
// ==========================================
exports.completeRide = async (req, res) => {
    try {
        const { rideId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(rideId)) {
            return res.status(400).json({ message: "Invalid Ride ID" });
        }

        const ride = await Ride.findOne({
            _id: rideId,
            captain: req.captain._id,
            status: "started"
        });

        if (!ride) {
            return res.status(400).json({ message: "Active started ride not found" });
        }

        ride.status = "completed";
        ride.completedAt = new Date();
        ride.finalFare = ride.finalFare || ride.estimatedFare;
        await ride.save();

        return res.status(200).json({
            success: true,
            message: "Ride completed successfully",
            fare: ride.finalFare,
            ride
        });
    } catch (error) {
        console.error("COMPLETE RIDE ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// ==========================================
// CANCEL RIDE (USER OR CAPTAIN)
// ==========================================
exports.cancelRide = async (req, res) => {
    try {
        const { rideId } = req.params;
        const { reason } = req.body;

        if (!mongoose.Types.ObjectId.isValid(rideId)) {
            return res.status(400).json({ message: "Invalid Ride ID" });
        }

        const ride = await Ride.findById(rideId);
        if (!ride) {
            return res.status(404).json({ message: "Ride not found" });
        }

        if (["completed", "cancelled"].includes(ride.status)) {
            return res.status(400).json({ message: `Ride is already ${ride.status}` });
        }

        const isUser = req.user && req.user._id.toString() === ride.user.toString();
        const isCaptain = req.captain && ride.captain && req.captain._id.toString() === ride.captain.toString();

        if (!isUser && !isCaptain) {
            return res.status(403).json({ message: "You are not authorized to cancel this ride" });
        }

        ride.status = "cancelled";
        ride.cancelledAt = new Date();
        ride.cancelledBy = isUser ? "user" : "captain";
        ride.cancellationReason = reason || "No reason specified";
        ride.offeredCaptain = null;
        await ride.save();

        return res.status(200).json({
            success: true,
            message: "Ride cancelled successfully",
            ride
        });
    } catch (error) {
        console.error("CANCEL RIDE ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// ==========================================
// GET RIDE DETAILS
// ==========================================
exports.getRideDetails = async (req, res) => {
    try {
        const { rideId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(rideId)) {
            return res.status(400).json({ message: "Invalid Ride ID" });
        }

        const ride = await Ride.findById(rideId)
            .populate("user", "name mobile gender referralCode ridePin")
            .populate("captain", "name mobile gender vehicle location status")
            .populate("offeredCaptain", "name mobile gender vehicle location status");

        if (!ride) {
            return res.status(404).json({ message: "Ride not found" });
        }

        return res.status(200).json({
            success: true,
            ride
        });
    } catch (error) {
        console.error("GET RIDE DETAILS ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// ==========================================
// GET ACTIVE RIDE FOR USER
// ==========================================
exports.getUserActiveRide = async (req, res) => {
    try {
        const ride = await Ride.findOne({
            user: req.user._id,
            status: { $in: ["requested", "accepted", "captain_arrived", "started"] }
        })
        .sort({ requestedAt: -1 })
        .populate("captain", "name mobile gender vehicle location status")
        .populate("offeredCaptain", "name mobile gender vehicle location status");

        return res.status(200).json({
            success: true,
            ride: ride || null
        });
    } catch (error) {
        console.error("GET USER ACTIVE RIDE ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// ==========================================
// GET ACTIVE RIDE FOR CAPTAIN
// ==========================================
exports.getCaptainActiveRide = async (req, res) => {
    try {
        const ride = await Ride.findOne({
            $or: [
                { captain: req.captain._id, status: { $in: ["accepted", "captain_arrived", "started"] } },
                { offeredCaptain: req.captain._id, status: "requested" }
            ]
        })
        .sort({ requestedAt: -1 })
        .populate("user", "name mobile gender");

        return res.status(200).json({
            success: true,
            ride: ride || null,
            isOffered: Boolean(ride && ride.offeredCaptain && ride.offeredCaptain.toString() === req.captain._id.toString())
        });
    } catch (error) {
        console.error("GET CAPTAIN ACTIVE RIDE ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// ==========================================
// USER RIDE HISTORY
// ==========================================
exports.getUserRideHistory = async (req, res) => {
    try {
        const rides = await Ride.find({ user: req.user._id })
            .sort({ requestedAt: -1 })
            .populate("captain", "name mobile vehicle");

        return res.status(200).json({
            success: true,
            rides
        });
    } catch (error) {
        console.error("USER RIDE HISTORY ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// ==========================================
// CAPTAIN RIDE HISTORY
// ==========================================
exports.getCaptainRideHistory = async (req, res) => {
    try {
        const rides = await Ride.find({ captain: req.captain._id })
            .sort({ requestedAt: -1 })
            .populate("user", "name mobile");

        return res.status(200).json({
            success: true,
            rides
        });
    } catch (error) {
        console.error("CAPTAIN RIDE HISTORY ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

