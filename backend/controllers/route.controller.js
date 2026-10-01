const path = require("path");

if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile(path.join(__dirname, "../.env"));
}

function calculateHaversineKm(lat1, lon1, lat2, lon2) {
    const toRad = (v) => (v * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const getRoute = async (req, res) => {
    try {
        const {
            pickupLat,
            pickupLng,
            dropLat,
            dropLng
        } = req.query;

        // 1. Check required values
        if (
            pickupLat === undefined ||
            pickupLng === undefined ||
            dropLat === undefined ||
            dropLng === undefined
        ) {
            return res.status(400).json({
                success: false,
                message: "pickupLat, pickupLng, dropLat and dropLng are required"
            });
        }

        // 2. Convert values to numbers
        const startLat = Number(pickupLat);
        const startLng = Number(pickupLng);
        const endLat = Number(dropLat);
        const endLng = Number(dropLng);

        // 3. Check numbers
        if (
            !Number.isFinite(startLat) ||
            !Number.isFinite(startLng) ||
            !Number.isFinite(endLat) ||
            !Number.isFinite(endLng)
        ) {
            return res.status(400).json({
                success: false,
                message: "Latitude and longitude must be valid numbers"
            });
        }

        // 4. Check latitude range
        if (
            startLat < -90 || startLat > 90 ||
            endLat < -90 || endLat > 90
        ) {
            return res.status(400).json({
                success: false,
                message: "Latitude must be between -90 and 90"
            });
        }

        // 5. Check longitude range
        if (
            startLng < -180 || startLng > 180 ||
            endLng < -180 || endLng > 180
        ) {
            return res.status(400).json({
                success: false,
                message: "Longitude must be between -180 and 180"
            });
        }

        // 6. Mapbox attempt if token is available
        const token = process.env.MAPBOX_ACCESS_TOKEN;

        if (token && token.trim().length > 10 && !token.includes("dummy")) {
            try {
                const coordinates = `${startLng},${startLat};${endLng},${endLat}`;
                const mapboxUrl =
                    `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}` +
                    `?alternatives=false&geometries=geojson&overview=full&steps=false&access_token=${encodeURIComponent(token)}`;

                const response = await fetch(mapboxUrl);
                const data = await response.json();

                if (response.ok && data.code === "Ok" && data.routes && data.routes.length > 0) {
                    const route = data.routes[0];
                    const distanceKm = Number((route.distance / 1000).toFixed(2));
                    const etaMinutes = Math.ceil(route.duration / 60);

                    return res.status(200).json({
                        success: true,
                        source: "mapbox",
                        route: {
                            distanceMeters: Math.round(route.distance),
                            distanceKm: distanceKm,
                            durationSeconds: Math.round(route.duration),
                            etaMinutes: etaMinutes,
                            geometry: route.geometry
                        }
                    });
                }
            } catch (err) {
                console.warn("Mapbox fetch error, falling back to geometric estimation:", err.message);
            }
        }

        // 7. Resilient Fallback (Haversine calculation + Road Factor)
        const straightKm = calculateHaversineKm(startLat, startLng, endLat, endLng);
        const roadKm = Number((straightKm * 1.25).toFixed(2));
        const durationSeconds = Math.round((roadKm / 28) * 3600); // avg 28 km/h city speed
        const etaMinutes = Math.max(3, Math.ceil(durationSeconds / 60));

        return res.status(200).json({
            success: true,
            source: "geometric_estimation",
            route: {
                distanceMeters: Math.round(roadKm * 1000),
                distanceKm: roadKm,
                durationSeconds: durationSeconds,
                etaMinutes: etaMinutes,
                geometry: {
                    type: "LineString",
                    coordinates: [
                        [startLng, startLat],
                        [endLng, endLat]
                    ]
                }
            }
        });

    } catch (error) {
        console.error("Route Error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = {
    getRoute
};