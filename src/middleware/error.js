export function errorHandler(err, req, res, next) {
  // Log for Render logs
  console.error('[error]', err);

  if (res.headersSent) return next(err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ message });
}
