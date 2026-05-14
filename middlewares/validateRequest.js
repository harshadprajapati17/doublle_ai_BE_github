import { ZodError } from "zod";
import { ValidationError } from "../errors/index.js";

/**
 * @param {{
 *   params?: import('zod').ZodTypeAny;
 *   query?: import('zod').ZodTypeAny;
 *   body?: import('zod').ZodTypeAny;
 * }} schemas
 */
export function validateRequest(schemas) {
  return (req, res, next) => {
    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }
      if (schemas.query) {
        Object.defineProperty(req, "query", {
          value: schemas.query.parse(req.query),
          writable: true,
          configurable: true,
          enumerable: true,
        });
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
