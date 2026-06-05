export function validate(schema) {
  return (req, _res, next) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      req.validated = parsed;
      next();
    } catch (err) {
      next(Object.assign(new Error("Validation failed"), { statusCode: 400, errors: err.errors || err.issues }));
    }
  };
}

