/**
 * Error with HTTP status for the central handler to use in api routes for call validation errors
 *
 * @since users-service-continued--JP
 */
import { STATUS_CODES } from '../enums/StatusCodes';
import { ErrorResponseItem } from '../contracts/Errors';
import { ExpressValidationErrorItem } from '../contracts/Errors';
import { AbstractRequestError } from "./AbstractRequestError";

export class RequestValidationError extends AbstractRequestError {
  public readonly reasons: ExpressValidationErrorItem[];
  public readonly name: string;
  public readonly statusCode: STATUS_CODES = STATUS_CODES.BAD_REQUEST;

  constructor(
    message: string,
    errors: ExpressValidationErrorItem[],
  ) {
    super(message);
    this.name = 'RequestValidationError';
    this.reasons = errors;
    Object.setPrototypeOf(this, RequestValidationError.prototype);
  }

  /**
   * Gets errors array list for 'errors' list in error-responses
   *
   * @returns {ErrorResponseItem[]}
   */
  genResponseErrItemsList(): ErrorResponseItem[] {
    return this.reasons.map((err) => {
      const error: ErrorResponseItem = {
        message: err.msg
      };

      if (err.type === 'field') error.field = err.path;

      return error;
    })
  }
}
