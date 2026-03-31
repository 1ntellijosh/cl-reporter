/**
 * Error class for all request errors that fail to execute from server side (5XX errors)
 * - INTERNAL_SERVER_ERROR: 500
 * - BAD_GATEWAY: 502
 * - SERVICE_UNAVAILABLE: 503
 * - GATEWAY_TIMEOUT: 504
 *
 * @since app-login--JP
 */
import { STATUS_CODES } from '../enums/StatusCodes';
import { ErrorResponseItem } from '../contracts/Errors';
import { AbstractRequestError } from "./AbstractRequestError";

export class ServerError extends AbstractRequestError {
  public readonly statusCode: STATUS_CODES;
  public readonly name: string;
  public readonly reason: string;

  constructor(message: string, statusCode: STATUS_CODES = STATUS_CODES.INTERNAL_SERVER_ERROR) {
    super(message);
    this.name = 'ServerError';
    this.statusCode = statusCode;
    this.reason = message;
    Object.setPrototypeOf(this, ServerError.prototype);
  }

  /**
   * Gets errors array list for 'errors' list in error-responses
   *
   * @returns {ErrorResponseItem[]}
   */
  genResponseErrItemsList(): ErrorResponseItem[] {
    const error: ErrorResponseItem = { message: this.reason };
    return [ error ];
  }
}
