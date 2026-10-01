const fareConfig = require("../config/fare.config");

const calculateFare = (req, res) => {
    try {
        const {
            distanceKm,
            vehicleType,
            district
        } = req.query;

        // 1. Required values
        if (distanceKm === undefined || !vehicleType) {
            return res.status(400).json({
                success: false,
                message: "distanceKm and vehicleType are required"
            });
        }

        // 2. Distance validation
        const distance = Number(distanceKm);

        if (!Number.isFinite(distance)) {
            return res.status(400).json({
                success: false,
                message: "distanceKm must be a valid number"
            });
        }

        if (distance < 0) {
            return res.status(400).json({
                success: false,
                message: "distanceKm cannot be negative"
            });
        }

        // 3. Vehicle validation
        const vehicle = vehicleType.toLowerCase();

        if (!fareConfig.general[vehicle]) {
            return res.status(400).json({
                success: false,
                message: "Invalid vehicleType. Use bike, auto or car"
            });
        }

        // 4. Start with general fare
        let fare = {
            ...fareConfig.general[vehicle]
        };

        // 5. Apply district-specific override
        if (district) {
            const districtKey = district
                .toLowerCase()
                .trim()
                .replace(/\s+/g, "-");

            const zone = fareConfig.zoneOverrides[districtKey];

            if (zone && zone[vehicle]) {
                fare = {
                    ...fare,
                    ...zone[vehicle]
                };
            }
        }

        // 6. Calculate fare
        let estimatedFare = fare.baseFare;

        if (distance > fare.includedKm) {
            const extraKm = distance - fare.includedKm;
            estimatedFare += extraKm * fare.perKm;
        }

        estimatedFare = Math.round(estimatedFare);

        // 7. Peak platform fee
        let peakPlatformFee = 0;

        if (fareConfig.peakPlatformFee.enabled) {
            peakPlatformFee = fareConfig.peakPlatformFee.minFee;
        }

        const totalFare = estimatedFare + peakPlatformFee;

        // 8. Response
        return res.status(200).json({
            success: true,

            fare: {
                vehicleType: vehicle,
                distanceKm: Number(distance.toFixed(2)),
                baseFare: fare.baseFare,
                includedKm: fare.includedKm,
                perKm: fare.perKm,
                estimatedFare: estimatedFare,
                peakPlatformFee: peakPlatformFee,
                totalFare: totalFare
            }
        });

    } catch (error) {
        console.error("Fare Calculation Error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = {
    calculateFare
};