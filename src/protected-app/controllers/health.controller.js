function getHealth(req, res) {
  res.json({
    service: "protected-web-app",
    status: "ok",
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  getHealth
};
