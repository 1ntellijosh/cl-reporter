/**
 * Holds helper functions for testing middleware
 *
 * @since tests-start--JP
 */
import { Request, Response, NextFunction } from 'express';
import { signAppSessionAccessToken } from '@reporter/common';

/**
 * Creates mock request variables
 *
 * @returns {Request, Response, NextFunction}
 */
export function createMockRequestVars(): { req: Request; res: Response; next: NextFunction } {
  return {
    req: {
      body: {},
      headers: {
        cookie: '',
        authorization: ''
      },
    } as unknown as Request,
    res: {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis()
    } as unknown as Response,
    next: jest.fn() as unknown as NextFunction
  }
};

/**
 * Sets a token in the request headers
 *
 * @param {Request} req  The request object
 * @param {string} jwtSigningKey  The JWT signing key
 *
 * @returns {string}  The token
 */
export function setTokenInReq(req: Request, jwtSigningKey: string): string {
  const signingKey = jwtSigningKey;
  const token = signAppSessionAccessToken(signingKey, 'test-merchant-mid');
  req.headers.authorization = `Bearer ${token}`;

  return token;
}
