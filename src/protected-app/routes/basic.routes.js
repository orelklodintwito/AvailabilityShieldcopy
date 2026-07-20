const express = require("express");
const { getBasic } = require("../controllers/basic.controller");

const router = express.Router();

router.get("/api/basic", getBasic);

module.exports = router;
