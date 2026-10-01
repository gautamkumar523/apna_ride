const express = require("express");

const router = express.Router();

const locationController = require("../controllers/location.controller");

router.get("/search", locationController.searchLocation);
router.get("/reverse", locationController.reverseLocation);

module.exports = router;