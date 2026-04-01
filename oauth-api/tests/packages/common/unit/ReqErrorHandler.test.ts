/**
 * Tests for ErrorHandler middleware
 *
 * @since setup-tests--JP
 */
import { jest } from '@jest/globals';
import { ReqErrorHandler } from '@reporter/common';
import { ValidationError } from 'express-validator';
import { ServerError } from '@reporter/common';
import { RequestValidationError } from '@reporter/common';
import { NotFoundError } from '@reporter/common';
import { createMockRequestVars } from '../CommonTestHelpers';

describe('ReqErrorHandler', () => {
  it('returns a 500 error for a generic error', () => {
    const error = new Error('test error');
    const { req, res, next } = createMockRequestVars();
    const respStatusSpy = jest.spyOn(res, 'status');
    const respJsonSpy = jest.spyOn(res, 'json');

    ReqErrorHandler.prepareErrResp(error, req, res, next);
    expect(respStatusSpy).toHaveBeenCalledWith(500);
    expect(respJsonSpy).toHaveBeenCalledWith({
      message: 'Request failed. Please try again.',
      errors: [{ message: error.message }],
    });
    respStatusSpy.mockRestore();
    respJsonSpy.mockRestore();
  });

  it('logs and handles a non user 5xx error', () => {
    const error = new ServerError('test error');
    const { req, res, next } = createMockRequestVars();
    const logHandlerSpy = jest.spyOn(ReqErrorHandler, 'logAndHandle5xxError');

    ReqErrorHandler.prepareErrResp(error, req, res, next);
    expect(logHandlerSpy).toHaveBeenCalledWith(error, req, res);
    logHandlerSpy.mockRestore();
  });

  it('returns a 400 error for a RequestValidationError', () => {
    const error = new RequestValidationError('test error', [
      { msg: 'test error', type: 'field', path: 'body', location: 'body' } as ValidationError
    ] as ValidationError[]);
    const genErrItemsSpy = jest.spyOn(error, 'genResponseErrItemsList');
    const { req, res, next } = createMockRequestVars();
    const respStatusSpy = jest.spyOn(res, 'status');
    const respJsonSpy = jest.spyOn(res, 'json');

    ReqErrorHandler.prepareErrResp(error, req, res, next);
    expect(respStatusSpy).toHaveBeenCalledWith(400);
    expect(respJsonSpy).toHaveBeenCalledWith({ 
      message: 'test error',
      errors: [{ message: error.message, field: 'body'}]
    });
    expect(genErrItemsSpy).toHaveBeenCalled();
    genErrItemsSpy.mockRestore();
    respStatusSpy.mockRestore();
    respJsonSpy.mockRestore();
  });

  it('returns a 404 error for a RequestValidationError', () => {
    const error = new NotFoundError('Not found');
    const { req, res, next } = createMockRequestVars();
    const genErrItemsSpy = jest.spyOn(error, 'genResponseErrItemsList');
    const respStatusSpy = jest.spyOn(res, 'status');
    const respJsonSpy = jest.spyOn(res, 'json');

    ReqErrorHandler.prepareErrResp(error, req, res, next);
    expect(genErrItemsSpy).toHaveBeenCalled();
    expect(respStatusSpy).toHaveBeenCalledWith(404);
    expect(respJsonSpy).toHaveBeenCalledWith({
      message: 'Not found',
      errors: [{ message: 'Not found' }]
    });
    genErrItemsSpy.mockRestore();
    respStatusSpy.mockRestore();
    respJsonSpy.mockRestore();
  });
});
