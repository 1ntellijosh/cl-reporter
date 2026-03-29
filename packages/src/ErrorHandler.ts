/**
 * Error handler middleware
 *
 * @since app-skaffold--JP
 */
import { Request, Response, NextFunction } from 'express';
import { AbstractRequestError } from './errors/AbstractRequestError';
import { ErrorResponse } from './interfaces/Errors';
import { STATUS_CODES } from './enums/StatusCodes';

export class ErrorHandler {
  /**
   * Main error-handling middleware method,handles next(err) from routes.
   * Uses statusCode from RequestValidationError when present; otherwise 500. Logs only 5xx.
   *
   * @param {AbstractRequestError} err  The error to handle
   * @param {Request} _req  The request object
   * @param {Response} res  The response object
   * @param {NextFunction} _next  The next function
   *
   * @returns {void}
   */
  static prepareErrResp(
    err: Error | AbstractRequestError,
    _req: Request,
    res: Response,
    next: NextFunction
  ) {
    const statusCode = err instanceof AbstractRequestError ? err.statusCode : STATUS_CODES.INTERNAL_SERVER_ERROR;

    if (statusCode >= 500) ErrorHandler.logAndHandle5xxError(err, _req, res);    
    
    if (err instanceof AbstractRequestError) {
      const resp: ErrorResponse = { 
        message: err.message,
        errors: err.genResponseErrItemsList() 
      };
      res.status(err.statusCode).json(resp);

      return next();
    }

    // This should never happen, but if it does, we'll handle it with generic 500 error
    const resp: ErrorResponse = { message: 'Request failed. Please try again.', errors: [{ message: err.message }] };
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json(resp);
    next();
  };

  /**
   * Logs and handles 5xx (non-user) errors
   * TODO: Add logging for 5xx (non-user)errors
   *
   * @param {Error} err  The error to log
   * @param {Request} req  The request object
   * @param {Response} res  The response object
   * @param {NextFunction} next  The next function
   *
   * @returns {void}
   */
  static logAndHandle5xxError(err: Error, _req: Request, res: Response) {
    // console.error('TODO: Log, handle 5xx errors....', err);
  }
}
