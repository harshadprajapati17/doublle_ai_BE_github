const { ZodError } = require("zod");
const { ValidationError } = require("../errors");

/**
 * @param {{
 *   params?: import('zod').ZodTypeAny;
 *   query?: import('zod').ZodTypeAny;
 *   body?: import('zod').ZodTypeAny;
 * }} schemas
 */
function validateRequest(schemas) {
  return (req, res, next) => {
    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      next();
    } catch (e) {
      if (e instanceof ZodError) {
        return next(new ValidationError("Invalid request.", e.flatten()));
      }
      return next(e);
    }
  };
}

module.exports = { validateRequest };
