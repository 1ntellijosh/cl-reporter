/**
 * Error class for all request errors that fail to execute because data/assets not found
 *
 * @since app-skaffold--JP
 */
import { STATUS_CODES } from '../enums/StatusCodes';
import { ErrorResponseItem } from '../contracts/Errors';
import { AbstractRequestError } from "./AbstractRequestError";

export class UnAuthorizedError extends AbstractRequestError {
  public readonly statusCode: STATUS_CODES = STATUS_CODES.UNAUTHORIZED;
  public readonly name: string;

  constructor(message: string) {
    super(message);
    this.name = 'UnAuthorizedError';
    Object.setPrototypeOf(this, UnAuthorizedError.prototype);
  }

  /**
   * Gets errors array list for 'errors' list in error-responses
   *
   * @returns {ErrorResponseItem[]}
   */
  genResponseErrItemsList(): ErrorResponseItem[] {
    const error: ErrorResponseItem = { message: "Not logged in" };
    return [ error ];
  }
}
