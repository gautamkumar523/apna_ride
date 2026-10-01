const mongoose = require("mongoose");
const Ride = require("../models/ride.model");
const Captain = require("../models/captain.model");
const User = require("../models/user.model");

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

// ==========================================
// FIND MATCHING CAPTAINS
// ==========================================

exports.findMatchingCaptains = async (req, res) => {

    try {

        const { rideId } = req.body;

        // ==========================================
        // RIDE ID VALIDATION
        // ==========================================

        if (!rideId) {
            return res.status(400).json({
                message: "Ride ID is required"
            });
        }

        if (!mongoose.Types.ObjectId.isValid(rideId)) {
            return res.status(400).json({
                message: "Invalid Ride ID"
            });
        }

        // ==========================================
        // FIND RIDE
        // ==========================================

        const ride = await Ride.findById(rideId);

        if (!ride) {
            return res.status(404).json({
                message: "Ride Not Found"
            });
        }

        // ==========================================
        // USER CAN MATCH ONLY HIS OWN RIDE
        // ==========================================

        if (ride.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                message: "You are not allowed to match this ride"
            });
        }

        // ==========================================
        // CHECK RIDE STATUS
        // ==========================================

        if (ride.status !== "requested") {
            return res.status(400).json({
                message: "Ride is not available for matching"
            });
        }

        // ==========================================
        // CURRENT OFFER ALREADY EXISTS
        // ==========================================

        if (ride.offeredCaptain) {
            const offeredCaptain = await Captain.findById(ride.offeredCaptain);

            if (offeredCaptain) {
                const distance = calculateDistance(
                    ride.pickup.lat,
                    ride.pickup.lng,
                    offeredCaptain.location.lat,
                    offeredCaptain.location.lng
                );

                if (
                    offeredCaptain.status === "online" &&
                    offeredCaptain.verificationStatus === "approved" &&
                    offeredCaptain.vehicle &&
                    offeredCaptain.vehicle.vehicleType === ride.vehicleType &&
                    typeof offeredCaptain.location?.lat === "number" &&
                    typeof offeredCaptain.location?.lng === "number" &&
                    distance <= MATCHING_RADIUS_KM
                ) {
                    return res.status(200).json({
                        success: true,
                        message: "Captain already offered for this ride",
                        rideId: ride._id,
                        vehicleType: ride.vehicleType,
                        pickup: ride.pickup,
                        captain: {
                            captainId: offeredCaptain._id,
                            name: offeredCaptain.name,
                            mobile: offeredCaptain.mobile,
                            gender: offeredCaptain.gender,
                            ridePreference: offeredCaptain.ridePreference,
                            vehicle: offeredCaptain.vehicle,
                            location: offeredCaptain.location,
                            distanceFromPickup: Number(distance.toFixed(2))
                        }
                    });
                }
            }

            // Stale offer: clear it before finding the next captain.
            ride.offeredCaptain = null;
            await ride.save();
        }

        // ==========================================
        // FIND USER
        // ==========================================

        const user = await User.findById(ride.user);

        if (!user) {
            return res.status(404).json({
                message: "User Not Found"
            });
        }

        // ==========================================
        // FIND ONLINE + APPROVED CAPTAINS
        // ==========================================

        const captains = await Captain.find({
            status: "online",
            verificationStatus: "approved",
            "vehicle.vehicleType": ride.vehicleType
        });

        // ==========================================
        // REMOVE ALREADY REJECTED CAPTAINS
        // ==========================================

        const rejectedCaptainIds = (ride.rejectedCaptains || [])
            .map(id => id.toString());

        // ==========================================
        // ELIGIBILITY + 20 KM RADIUS
        // ==========================================

        const eligibleCaptains = captains.filter((captain) => {

            if (rejectedCaptainIds.includes(captain._id.toString())) {
                return false;
            }

            if (
                !captain.location ||
                typeof captain.location.lat !== "number" ||
                typeof captain.location.lng !== "number"
            ) {
                return false;
            }

            // Customer requested female-only captain.
            if (
                ride.captainPreference === "female_only" &&
                captain.gender !== "female"
            ) {
                return false;
            }

            // Captain accepts only female customers.
            if (
                captain.ridePreference === "female_only" &&
                user.gender !== "female"
            ) {
                return false;
            }

            const distance = calculateDistance(
                ride.pickup.lat,
                ride.pickup.lng,
                captain.location.lat,
                captain.location.lng
            );

            return distance <= MATCHING_RADIUS_KM;
        });

        // ==========================================
        // NO CAPTAIN
        // ==========================================

        if (eligibleCaptains.length === 0) {
            return res.status(404).json({
                message: `No ${ride.vehicleType} captain available within 20 km`
            });
        }

        // ==========================================
        // NEAREST CAPTAIN FIRST
        // ==========================================

        const rankedCaptains = eligibleCaptains.map((captain) => {

            const distance = calculateDistance(
                ride.pickup.lat,
                ride.pickup.lng,
                captain.location.lat,
                captain.location.lng
            );

            return {
                captain,
                distance
            };
        });

        rankedCaptains.sort((a, b) => a.distance - b.distance);

        const nearest = rankedCaptains[0];

        // ==========================================
        // ATOMICALLY OFFER RIDE TO NEAREST CAPTAIN
        // ==========================================

        const offeredRide = await Ride.findOneAndUpdate(
            {
                _id: ride._id,
                status: "requested",
                captain: null,
                offeredCaptain: null
            },
            {
                $set: {
                    offeredCaptain: nearest.captain._id
                }
            },
            { new: true }
        );

        if (!offeredRide) {
            return res.status(409).json({
                message: "Ride matching is already being processed"
            });
        }

        // ==========================================
        // RETURN ONLY CURRENT CAPTAIN
        // This enforces nearest-first sequential matching.
        // ==========================================

        return res.status(200).json({

            success: true,

            message: "Ride offered to nearest eligible captain",

            rideId: offeredRide._id,

            vehicleType: offeredRide.vehicleType,

            pickup: offeredRide.pickup,

            captain: {
                captainId: nearest.captain._id,
                name: nearest.captain.name,
                mobile: nearest.captain.mobile,
                gender: nearest.captain.gender,
                ridePreference: nearest.captain.ridePreference,
                vehicle: nearest.captain.vehicle,
                location: nearest.captain.location,
                distanceFromPickup: Number(nearest.distance.toFixed(2))
            }

        });

    } catch (error) {

        console.log("MATCHING ERROR:");
        console.log(error);

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};
