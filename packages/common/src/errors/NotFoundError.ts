/**
 * Error class for all request errors that fail to execute because data/assets not found
 *
 * @since users-service-continued--JP
 */
import { STATUS_CODES } from '../enums/StatusCodes';
import { ErrorResponseItem } from '../contracts/Errors';
import { AbstractRequestError } from "./AbstractRequestError";

export class NotFoundError extends AbstractRequestError {
  public readonly statusCode: STATUS_CODES = STATUS_CODES.NOT_FOUND;
  public readonly name: string;

  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }

  /**
   * Gets errors array list for 'errors' list in error-responses
   *
   * @returns {ErrorResponseItem[]}
   */
  genResponseErrItemsList(): ErrorResponseItem[] {
    const error: ErrorResponseItem = { message: this.message };

    return [ error ];
  }
}
