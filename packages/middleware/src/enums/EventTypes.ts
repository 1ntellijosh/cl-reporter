/**
 * Exchange and message type constants for Clover Reporter message queue (RabbitMQ).
 * Message types double as routing keys for topic/direct exchanges.
 *
 * @since app-skaffold--JP
 */

export enum EventTypesEnum {
  TOKEN_UPDATE_REFRESH_TOKEN = 'token.update-refresh-token',
  REPORT_GENERATE = 'report.generate',
}
