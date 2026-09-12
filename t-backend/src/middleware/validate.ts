import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError, z } from 'zod';
import { AppError } from './errorHandler';

/**
 * Where `validate` parks its parsed output. Express exposes `req.query` through
 * a getter with no setter, so coerced values (`page` and `limit` arrive as
 * strings) cannot be written back over the raw ones.
 */
const VALIDATED_INPUT = Symbol('validatedInput');

/**
 * Generic Zod validation middleware factory.
 * Validates req.body, req.query, and/or req.params against the provided schema.
 */
export function validate(schema: AnyZodObject) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      Reflect.set(req, VALIDATED_INPUT, parsed);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: Record<string, string[]> = {};
        error.errors.forEach((err) => {
          const path = err.path.slice(1).join('.') || 'unknown';
          if (!errors[path]) errors[path] = [];
          errors[path].push(err.message);
        });

        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors,
        });
        return;
      }
      next(error);
    }
  };
}

/**
 * Reads back what `validate(schema)` parsed for this request, typed from the
 * schema. The schema is passed again only to recover its inferred type; it is
 * never re-run.
 */
export function getValidatedInput<TSchema extends AnyZodObject>(
  req: Request,
  _schema: TSchema
): z.infer<TSchema> {
  const parsed = Reflect.get(req, VALIDATED_INPUT);

  if (parsed === undefined) {
    throw new AppError('Request reached the handler without being validated', 500);
  }

  return parsed as z.infer<TSchema>;
}
