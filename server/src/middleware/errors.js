export function notFoundHandler(_req, res) {
  res.status(404).json({ message: "Route not found" });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  const status = err?.statusCode || 500;
  const message =
    err?.message || (status === 500 ? "Internal server error" : "Request failed");

  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  res.status(status).json({
    message,
    ...(err?.errors ? { errors: err.errors } : {}),
  });
}

