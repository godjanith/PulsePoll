export const notFoundHandler = (req, res) => {
  res.status(404).json({ success: false, message: 'The requested endpoint was not found.' });
};

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  // Keep diagnostic details in server logs, never in the response body.
  console.error('[Server Error]', err?.message || 'Unknown error');

  if (err?.name === 'ValidationError') {
    const errors = Object.values(err.errors || {}).map((item) => item.message);
    return res.status(400).json({ success: false, message: 'Validation failed.', errors });
  }
  if (err?.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'The supplied identifier is invalid.' });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'The request is too large.' });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'The request body must contain valid JSON.' });
  }

  const statusCode = Number.isInteger(err?.status) && err.status >= 400 && err.status < 600 ? err.status : 500;
  const message = statusCode >= 500
    ? 'An unexpected server error occurred.'
    : (err.message || 'The request could not be completed.');
  return res.status(statusCode).json({ success: false, message });
};
