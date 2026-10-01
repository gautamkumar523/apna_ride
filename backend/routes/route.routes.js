const express = require("express");
const router = express.Router();

const routeController = require("../controllers/route.controller");

// Get route, distance and ETA
router.get("/route", routeController.getRoute);

module.exports = router;