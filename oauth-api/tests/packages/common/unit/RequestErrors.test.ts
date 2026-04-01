/**
 * Tests for RequestErrors middleware
 *
 * @since setup-tests--JP
 */
import { ValidationError } from 'express-validator';
import { ServerError } from '@reporter/common';
import { RequestValidationError } from '@reporter/common';
import { NotFoundError } from '@reporter/common';
import { BadRequestError } from '@reporter/common';
import { UnAuthorizedError } from '@reporter/common';
import { DatabaseConnectionError } from '@reporter/common';
import { AbstractRequestError } from '@reporter/common';
import { APIError } from '@reporter/common';

describe('RequestError', () => {
  it('should create a RequestValidationError with correct fields', () => {
    const error = new RequestValidationError('test error', [
      { msg: 'test error', type: 'field', path: 'body', location: 'body' } as ValidationError
    ] as ValidationError[]);
    expect(error).toBeInstanceOf(AbstractRequestError);
    expect(error.message).toBe('test error');
    expect(error.reasons).toEqual([
      { msg: 'test error', type: 'field', path: 'body', location: 'body' } as ValidationError
    ]);
    expect(error.name).toBe('RequestValidationError');
    expect(error.statusCode).toBe(400);
    expect(error.genResponseErrItemsList()).toEqual([
      { message: 'test error', field: 'body' }
    ]);
  });

  it('should create a ServerError with correct fields', () => {
    const error = new ServerError('test error');
    expect(error).toBeInstanceOf(AbstractRequestError);
    expect(error.message).toBe('test error');
    expect(error.name).toBe('ServerError');
    expect(error.statusCode).toBe(500);
    expect(error.genResponseErrItemsList()).toEqual([
      { message: 'test error' }
    ]);
  });

  it('should create a NotFoundError with correct fields', () => {
    const error = new NotFoundError('Not found');
    expect(error).toBeInstanceOf(AbstractRequestError);
    expect(error.message).toBe('Not found');
    expect(error.name).toBe('NotFoundError');
    expect(error.statusCode).toBe(404);
    expect(error.genResponseErrItemsList()).toEqual([
      { message: 'Not found' }
    ]);
  });

  it('should create a BadRequestError with correct fields', () => {
    const error = new BadRequestError('Bad request');
    expect(error).toBeInstanceOf(AbstractRequestError);
    expect(error.message).toBe('Bad request');
    expect(error.name).toBe('BadRequestError');
    expect(error.statusCode).toBe(400);
    expect(error.genResponseErrItemsList()).toEqual([
      { message: 'Bad request' }
    ]);
  });

  it('should create a UnAuthorizedError with correct fields', () => {
    const error = new UnAuthorizedError('Unauthorized');
    expect(error).toBeInstanceOf(AbstractRequestError);
    expect(error.message).toBe('Unauthorized');
    expect(error.name).toBe('UnAuthorizedError');
    expect(error.statusCode).toBe(401);
    expect(error.genResponseErrItemsList()).toEqual([
      { message: 'Not logged in' }
    ]);
  });

  it('should create a DatabaseConnectionError with correct fields', () => {
    const error = new DatabaseConnectionError('Failed to connect to database');
    expect(error).toBeInstanceOf(AbstractRequestError);
    expect(error.message).toBe('Failed to connect to database');
    expect(error.name).toBe('DatabaseConnectionError');
    expect(error.statusCode).toBe(500);
    expect(error.genResponseErrItemsList()).toEqual([
      { message: 'Failed to connect to database' }
    ]);
  });

  it('should create a APIError with correct fields', () => {
    const error = new APIError('API error', 500, [{ message: 'API error' }]);
    expect(error).toBeInstanceOf(AbstractRequestError);
    expect(error.message).toBe('API error');
    expect(error.name).toBe('APIError');
    expect(error.statusCode).toBe(500);
    expect(error.genResponseErrItemsList()).toEqual([
      { message: 'API error' }
    ]);
  });
});
