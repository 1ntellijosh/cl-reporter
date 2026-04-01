/**
 * Tests for RequestHandler middleware
 *
 * @since setup-tests--JP
 */
import { RequestHandler } from '@reporter/common';
import { createMockRequestVars, setTokenInReq } from '../CommonTestHelpers';
import { validationResult, ValidationError } from 'express-validator';
import { RequestValidationError, UnAuthorizedError } from '@reporter/common';

jest.mock('express-validator', () => ({
  validationResult: jest.fn(),
}));

const mockValidationErrors: ValidationError[] = [
  { msg: 'test error', type: 'field', path: 'body', location: 'body' } as ValidationError,
];

const reqBody = { email: 'someguy@someemail.com', password: 'password' };

describe('RequestHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SIGNING_KEY = 'test-key';
  });

  it('should call the given async function', async () => {
    const fn = jest.fn();
    const { req, res, next } = createMockRequestVars();
    req.body = reqBody;

    await RequestHandler.callAsync(fn)(req, res, next);
    expect(fn).toHaveBeenCalledWith(req, res, next);
  });

  it('should call the next function if the request is valid', () => {
    const { req, res, next } = createMockRequestVars();
    req.body = reqBody;
    (validationResult as unknown as jest.Mock).mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });

    RequestHandler.validateRequest(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should throw a RequestValidationError if the request is invalid', () => {
    const { req, res, next } = createMockRequestVars();
    req.body = reqBody;
    (validationResult as unknown as jest.Mock).mockReturnValue({
      isEmpty: () => false,
      array: () => mockValidationErrors,
    });

    expect(() => RequestHandler.validateRequest(req, res, next)).toThrow(RequestValidationError);
  });

  it('should return null if the current user is not authenticated', () => {
    const { req } = createMockRequestVars();
    const user = RequestHandler.getCurrentUser(req);

    expect(user).toBeNull();
  });

  it('should return the current user when Authorization Bearer has a valid app-session JWT', () => {
    const { req } = createMockRequestVars();
    const token = setTokenInReq(req, process.env.JWT_SIGNING_KEY!);

    const user = RequestHandler.getCurrentUser(req);

    expect(user).not.toBeNull();
    expect(user!.cloverMerchantId).toBe('test-merchant-mid');
  });

  it('should throw an UnAuthorizedError if the user is not authenticated', () => {
    const { req, res, next } = createMockRequestVars();

    expect(() => RequestHandler.authIsRequired(req, res, next)).toThrow(UnAuthorizedError);
  });

  it('should call the next function if the user is authenticated', () => {
    const { req, res, next } = createMockRequestVars();
    const token = setTokenInReq(req, process.env.JWT_SIGNING_KEY!);
    req.body = reqBody;
    const currentUserSpy = jest.spyOn(RequestHandler, 'getCurrentUser');

    RequestHandler.authIsRequired(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(currentUserSpy).toHaveBeenCalled();
  });
});
