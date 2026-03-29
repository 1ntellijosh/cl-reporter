import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { RequestValidationError } from './errors/RequestValidationError';
import { UnAuthorizedError } from './errors/UnAuthorizedError';
import jwt from 'jsonwebtoken';

export interface UserJwtPayload {
  id: string;
  email: string;
  iat: number;
}

declare global {
  namespace Express {
    interface Request {
      currentUser?: UserJwtPayload;
      session: {
        jwt?: string;
      } | null | undefined;
    }
  }
}

/**
 * API request middleware class. Wraps an api function in a try/catch block and returns a function that can be used in
 * an express route. If error is thrown, it is passed to the next middleware (ErrorHandler will handle it)
 *
 * @since users-service-continued--JP
 */
export class APIRequest {
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
   * Gets the current user data from the jwt in session (if present)
   *
   * @param {Request} req  The request to get the current user from
   * @param {Response} res  The response to send
   * @param {NextFunction} next  The next function to call
   *
   * @returns {UserJwtPayload | null}  The current user data
   */
  static getCurrentUser(req: Request, _res: Response, next: NextFunction) {
    // If no jwt in session, api will simply have currentUser undefined
    const session = req.session as { jwt?: string } | undefined;
    if (!session?.jwt) return next();
  
    try {
      const payload = jwt.verify(session.jwt, process.env.JWT_KEY!) as UserJwtPayload;
  
      req.currentUser = payload;
    } catch (err) {}

    next();
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
    if (!req.currentUser) throw new UnAuthorizedError('Not authenticated (from APIRequest.authIsRequired)');

    next();
  }
}
