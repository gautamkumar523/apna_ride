const express = require("express");
const router = express.Router();

const fareController = require("../controllers/fare.controller");

// Calculate estimated fare
router.get("/calculate", fareController.calculateFare);

module.exports = router;