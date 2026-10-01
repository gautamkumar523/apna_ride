exports.requireApprovedCaptain = (req, res, next) => {
    try {

        if (!req.captain) {
            return res.status(401).json({
                message: "Captain Authentication Required"
            });
        }

        if (req.captain.verificationStatus !== "approved") {
            return res.status(403).json({
                message: "Captain is not approved"
            });
        }

        next();

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};