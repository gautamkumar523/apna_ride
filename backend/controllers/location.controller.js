const https = require("https");

exports.searchLocation = async (req, res) => {
    try {
        const query = req.query.q;

        if (!query || query.trim().length < 2) {
            return res.status(400).json({
                message: "Location search query is required"
            });
        }

        const searchQuery = encodeURIComponent(
            query.trim() + ", Bihar, India"
        );

        const url =
            `https://nominatim.openstreetmap.org/search` +
            `?q=${searchQuery}` +
            `&format=jsonv2` +
            `&limit=5` +
            `&addressdetails=1`;

        https.get(
            url,
            {
                headers: {
                    "User-Agent": "Apna-Ride/1.0 (location-search)"
                }
            },
            (response) => {

                let data = "";

                response.on("data", (chunk) => {
                    data += chunk;
                });

                response.on("end", () => {
                    try {
                        const results = JSON.parse(data);

                        const locations = results.map((item) => ({
                            name: item.display_name,
                            latitude: Number(item.lat),
                            longitude: Number(item.lon)
                        }));

                        return res.status(200).json({
                            message: "Location search successful",
                            results: locations
                        });

                    } catch (error) {
                        console.log("LOCATION JSON ERROR:", error);

                        return res.status(500).json({
                            message: "Unable to process location results"
                        });
                    }
                });
            }
        ).on("error", (error) => {

            console.log("LOCATION SEARCH ERROR:", error);

            return res.status(500).json({
                message: "Location service unavailable"
            });
        });

    } catch (error) {

        console.log("LOCATION CONTROLLER ERROR:", error);

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};




exports.reverseLocation = async (req, res) => {
    try {
        const { lat, lng } = req.query;

        if (lat === undefined || lng === undefined) {
            return res.status(400).json({
                message: "Latitude and longitude are required"
            });
        }

        const latitude = Number(lat);
        const longitude = Number(lng);

        if (
            Number.isNaN(latitude) ||
            Number.isNaN(longitude)
        ) {
            return res.status(400).json({
                message: "Latitude and longitude must be numbers"
            });
        }

if (
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
) {
    return res.status(400).json({
        message: "Invalid latitude or longitude range"
    });
}





        const url =
            `https://nominatim.openstreetmap.org/reverse` +
            `?lat=${latitude}` +
            `&lon=${longitude}` +
            `&format=jsonv2` +
            `&addressdetails=1`;

        https.get(
            url,
            {
                headers: {
                    "User-Agent": "Apna-Ride/1.0 (reverse-location)"
                }
            },
            (response) => {

                let data = "";

                response.on("data", (chunk) => {
                    data += chunk;
                });

                response.on("end", () => {
                    try {
                        const result = JSON.parse(data);

                        return res.status(200).json({
                            message: "Location found successfully",
                            location: {
                                name: result.display_name || "Selected Location",
                                latitude: latitude,
                                longitude: longitude
                            }
                        });

                    } catch (error) {
                        console.log("REVERSE LOCATION JSON ERROR:", error);

                        return res.status(500).json({
                            message: "Unable to process location"
                        });
                    }
                });
            }
        ).on("error", (error) => {

            console.log("REVERSE LOCATION ERROR:", error);

            return res.status(500).json({
                message: "Location service unavailable"
            });
        });

    } catch (error) {

        console.log("REVERSE LOCATION CONTROLLER ERROR:", error);

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};