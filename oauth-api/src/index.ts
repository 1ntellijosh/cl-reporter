/**
 * Main entry point for auth microservice (auth-srv) setup and running
 *
 * @since auth-micro-start--JP
 */
import { oAuthApp } from './App';
import { DatabaseConnectionError } from '@reporter/core';
import { connectToRabbitMQ, disconnectFromRabbitMQ } from '@reporter/core';
// import { OAuthTokenUpdateRefreshTokenSubscription } from './events/OAuthSubscriptions';
import { subscribeQueues } from '@reporter/core';

const PORT = process.env.PORT || 3000;

const startService = async () => {
  // if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not defined');

  // await mongoose.connect(process.env.MONGO_URI).catch((err) => {
  //   throw new DatabaseConnectionError('auth-srv failed to connect to database: ' + err.message);
  // });

  oAuthApp.listen(PORT, () => {
    console.log(`OAuth API service listening on port ${PORT}...`);
  });
};

connectToRabbitMQ().then(async (channel) => {
  // Subscribe to RabbitMQ to handle message events between microservices
  // await subscribeQueues(channel, [OAuthTokenUpdateRefreshTokenSubscription]);

  await startService();
}).catch((err) => {
  console.error('Error connecting to RabbitMQ: ', err);
  process.exit(1);
});

process.on('SIGINT', async () => {
  await disconnectFromRabbitMQ();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectFromRabbitMQ();
  process.exit(0);
});
