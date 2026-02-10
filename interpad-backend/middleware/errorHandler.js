// Middleware për trajtimin e route-ve që nuk ekzistojnë
function notFound(req, res, next) {
  res.status(404).json({
    success: false,
    message: 'The route you requested does not exist',
  });
}

// Middleware qendror për trajtimin e gabimeve
// Nëse diku përdoret next(err), do të përfundojë këtu
function errorHandler(err, req, res, next) {
  console.error('Unhandled error:', err);

  const statusCode = err.statusCode || 500;
  const message =
    err.message || 'An error occurred on the server. Please try again later.';

  res.status(statusCode).json({
    success: false,
    message,
  });
}

module.exports = {
  notFound,
  errorHandler,
};


