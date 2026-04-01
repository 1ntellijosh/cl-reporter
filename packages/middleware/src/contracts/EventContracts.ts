/**
 * Event envelope contract for Clover Reporter platform (microservice-to-microservice over RabbitMQ).
 * Wire format: serializable JSON; timestamps as ISO 8601 strings for cross-service compatibility.
 *
 * @since app-skaffold--JP
 */
import { EventTypesEnum } from '../enums/EventTypes';
import { EXCHANGE_NAME, DELAYED_EXCHANGE_NAME } from '../consts/RabbitConsts';

/**
 * Schema version for the envelope;
 * - Need to update if metadata shape changes.
 * - This will enable consumers to support multiple versions.
 */
export const EVENT_SCHEMA_VERSION = 1;

export interface EventMetadata {
  /** Unique id for this event, used for idempotency key when consuming */
  eventId: string;
  eventType: EventTypesEnum;
  /** ISO 8601 string (e.g. new Date().toISOString()). Use string on the wire so all consumers parse consistently. */
  eventTimestamp: string;
  schemaVersion: number;
  /** Optional: for distributed tracing / request correlation. */
  correlationId?: string;
}

/** Event payloads: plain serializable objects only (no Date, no class instances). */
export interface EventData {}

/**
 * Envelope for all events: metadata + typed data. Serialize with JSON.stringify for RabbitMQ.
 * Use generic EventEnvelope<YourData> for typed publish/consume.
 */
export interface EventEnvelope<T extends EventData = EventData> {
  metadata: EventMetadata;
  data: T;
}

/**
 * Data structure for a microservice to subscribe to events for a given queue.
 *
 * @param queueName - The name of the queue to subscribe to.
 * @param eventConsumers - The event consumers to register for the queue.
 */
export type ServiceSubscription = {
  queueName: string;
  eventConsumers: EventConsumerMap;
}

/**
 * Map of event types to their consumer functions, passed to EventConsumer.registerEventConsumers().
 * Usage:
 *   const consumer = new EventConsumer(channel);
 *   await consumer.registerEventConsumers({
 *     [EventTypesEnum.USER_CREATED]: async (envelope) => {
 *       const data = envelope.data as UserIdentityData;
 *       // ...
 *     },
 *   }).startConsuming('auth-srv.user-events');
 */
export type EventConsumerMap = Partial<{
  [key in EventTypesEnum]: {
    handler: (envelope: EventEnvelope<EventData>) => Promise<void>;
    exchange: typeof EXCHANGE_NAME | typeof DELAYED_EXCHANGE_NAME;
  };
}>;
