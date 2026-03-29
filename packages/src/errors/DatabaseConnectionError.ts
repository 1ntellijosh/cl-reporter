/**
 * Error with HTTP status for the central handler to use in api routes for database connection errors
 *
 * @since app-skaffold--JP
 */
import { STATUS_CODES } from '../enums/StatusCodes';
import { ErrorResponseItem } from '../interfaces/Errors';
import { AbstractRequestError } from "./AbstractRequestError";

export class DatabaseConnectionError extends AbstractRequestError {
  public readonly statusCode: STATUS_CODES = STATUS_CODES.INTERNAL_SERVER_ERROR;
  public readonly name: string;

  constructor(message: string = 'Failed to connect to database') {
    super(message);
    this.name = 'DatabaseConnectionError';

    Object.setPrototypeOf(this, DatabaseConnectionError.prototype);
  }

  /**
   * Gets errors array list for 'errors' list in error-responses
   *
   * @returns {ErrorResponseItem[]}
   */
  genResponseErrItemsList(): ErrorResponseItem[] {
    const error: ErrorResponseItem = { message: 'Failed to connect to database' };
    return [ error ];
  }
}
