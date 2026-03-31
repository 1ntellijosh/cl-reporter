/**
 * Shared status codes enums for Clover Reporter app
 *
 * @since agentic-flow--JP
 */

// Handled status codes in this app
export enum STATUS_CODES {
  SUCCESS = 200,
  CREATED = 201,
  FOUND = 302, // Redirect
  NOT_FOUND = 404,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  REQUEST_TIMEOUT = 408,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504,
  NO_RESPONSE = 0, // No HTTP response (e.g. network failure, CORS, timeout before response)
}
