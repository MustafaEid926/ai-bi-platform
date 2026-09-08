import type {
    Request,
    Response,
    NextFunction,
} from 'express';

import { AppError } from '@aibi/errors';

type ValidationError = Error & {
    issues: unknown[];
};

const isValidationError = (err: unknown): err is ValidationError =>
    err instanceof Error &&
    err.name === 'ZodError' &&
    Array.isArray((err as ValidationError).issues);

export const asyncHandler =
    (fn: any) =>
        (
            req: Request,
            res: Response,
            next: NextFunction,
        ) =>
            Promise.resolve(fn(req, res, next)).catch(next);

export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    _next: NextFunction,
) => {
    if (isValidationError(err)) {
        res.status(400).json({
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Request validation failed',
                details: err.issues,
                request_id: req.header('x-request-id'),
            },
        });

        return;
    }

    const e =
        err instanceof AppError
            ? err
            : new AppError(
                'INTERNAL_SERVER_ERROR',
                500,
                'Internal server error',
            );

    res.status(e.status).json({
        error: {
            code: e.code,
            message: e.message,
            details: e.details,
            request_id: req.header('x-request-id'),
        },
    });
};