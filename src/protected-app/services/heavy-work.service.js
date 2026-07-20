const { sleep } = require("../../shared/sleep");

async function simulateSearchWork() {
  await sleep(250);

  return {
    results: ["item-1", "item-2", "item-3"],
    processingMs: 250
  };
}

async function simulateReportWork() {
  await sleep(700);

  return {
    reportId: Math.floor(Math.random() * 100000),
    processingMs: 700
  };
}

async function simulateExportWork() {
  await sleep(1200);

  return {
    exportId: Math.floor(Math.random() * 100000),
    processingMs: 1200
  };
}

module.exports = {
  simulateSearchWork,
  simulateReportWork,
  simulateExportWork
};
