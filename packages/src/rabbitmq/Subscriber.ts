/**
 * Subscribes a reporter service to rabbitmq queues.
 *
 * @since app-skaffold--JP
 */
import { ServiceSubscription, EventConsumerMap } from '../interfaces/EventContracts';
import { EventConsumer } from './EventConsumer';
import amqplib from 'amqplib';

type amqplibChannel = amqplib.Channel;

/**
 * Subscribes a microservice to events from other services.
 *
 * @param {amqplibChannel} channel - The channel to subscribe to.
 * @param {ServiceSubscription[]} subscriptions - The subscriptions to subscribe to.
 *
 * @returns {Promise<void>}
 */
export async function subscribeQueues(channel: amqplibChannel, subscriptions: ServiceSubscription[]) {
  for (const subscription of subscriptions) {
    const consumer = new EventConsumer(channel);
    await consumer.registerEventConsumers(subscription.eventConsumers as EventConsumerMap)
      .startConsuming(subscription.queueName);
  }
}
