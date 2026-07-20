const express = require("express");
const {
  getSearch,
  getReport,
  getExport
} = require("../controllers/heavy.controller");

const router = express.Router();

router.get("/api/search", getSearch);
router.get("/api/report", getReport);
router.get("/api/export", getExport);

module.exports = router;
