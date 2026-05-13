/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "Route not found.",
      details: { method: req.method, path: req.path },
    },
  });
}

module.exports = { notFoundHandler };
