/**
 * API service class for handling API requests. Wraps an API function in a try/catch block and returns a function that
 * can be used in an express route. If error is thrown, it is passed to the next middleware (ReqErrorHandler will handle)
 *
 * @since app-login--JP
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { RequestValidationError } from '../errors/RequestValidationError';
import { UnAuthorizedError } from '../errors/UnAuthorizedError';
import type { UserJwtPayload } from '../contracts/AppSessionJwt';
import { extractUserPayloadFromBearerOrAppSessionCookie } from './BearerAuth';

export type { UserJwtPayload };

export class RequestHandler {
  /**
   * Calls given async api function and catches all errors, passing them to the next middleware
   *
   * @param {Function} fn  The api function to wrap/call
   *
   * @returns {Function}  The wrapped api function
   */
  static callAsync(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Validates request using express-validator
   *
   * @param {Request} req  The request to validate
   * @param {Response} res  The response to send
   * @param {NextFunction} next  The next function to call
   *
   * @returns {void}
   *
   * @throws {RequestValidationError}  If request validation fails
   */
  static validateRequest(req: Request, _res: Response, next: NextFunction) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new RequestValidationError('Request validation failed', errors.array())
    }

    next();
  }

  /**
   * Returns decoded app-session JWT claims from `Authorization: Bearer` or from the HttpOnly access cookie
   * (`cl_reporter_app_access`) set by the Next.js app after OAuth (same HS256 token minted server-side).
   * Does not mutate `req`.
   *
   * @param {Request} req  Incoming HTTP request.
   * @returns Verified {@link UserJwtPayload}, or null.
   */
  static getCurrentUser(req: Request): UserJwtPayload | null {
    return extractUserPayloadFromBearerOrAppSessionCookie(
      req.headers.authorization,
      req.headers.cookie,
      process.env.JWT_SIGNING_KEY,
    );
  }

  /**
   * Checks if the user is authenticated, throws UnAuthorizedError if not. Used for routes that require user to be
   * logged in
   *
   * @param {Request} req  The request to check if the user is authenticated
   * @param {Response} res  The response to send
   * @param {NextFunction} next  The next function to call
   *
   * @returns {void}
   */
  static authIsRequired(req: Request, _res: Response, next: NextFunction) {
    if (!RequestHandler.getCurrentUser(req)) {
      throw new UnAuthorizedError('Not authenticated (from RequestHandler.authIsRequired)');
    }

    next();
  }
}
