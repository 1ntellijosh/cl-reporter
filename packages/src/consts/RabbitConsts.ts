/**
 * Constants for Clover Reporter message queue (RabbitMQ).
 *
 * @since app-skaffold--JP
 */

/** Main message queue exchange name. */
export const EXCHANGE_NAME = 'cl-reporter.main.eventbus';

/** Delayed message queue exchange name. */
export const DELAYED_EXCHANGE_NAME = 'cl-reporter.delayed.eventbus';