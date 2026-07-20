const {
  simulateSearchWork,
  simulateReportWork,
  simulateExportWork
} = require("../services/heavy-work.service");

async function getSearch(req, res) {
  const data = await simulateSearchWork();

  res.json({
    endpoint: "/api/search",
    type: "heavy",
    message: "Search results generated",
    ...data,
    timestamp: new Date().toISOString()
  });
}

async function getReport(req, res) {
  const data = await simulateReportWork();

  res.json({
    endpoint: "/api/report",
    type: "heavy",
    message: "Report generated",
    ...data,
    timestamp: new Date().toISOString()
  });
}

async function getExport(req, res) {
  const data = await simulateExportWork();

  res.json({
    endpoint: "/api/export",
    type: "heavy",
    message: "Export completed",
    ...data,
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  getSearch,
  getReport,
  getExport
};
