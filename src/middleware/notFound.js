/**
 * Catch-all for unmatched routes. Runs after all real routes, before the
 * error handler.
 */
export const notFound = (req, res) => {
  res.status(404).json({
    error: {
      message: `Route not found: ${req.method} ${req.originalUrl}`,
    },
  });
};
