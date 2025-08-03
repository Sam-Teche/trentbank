// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!" });
};

// 404 handler
const notFoundHandler = (req, res) => {
  res.status(404).json({ message: "Route not found" });
};

module.exports = {
  errorHandler,
  notFoundHandler,
};
