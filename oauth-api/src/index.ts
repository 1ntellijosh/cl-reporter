/**
 * Main entry point for auth microservice (auth-srv) setup and running
 *
 * @since auth-micro-start--JP
 */
import { oAuthApp } from './App';
import {
  connectToRabbitMQ,
  disconnectFromRabbitMQ,
  connectDatabase,
  disconnectDatabase,
  DatabaseConnectionError
  // subscribeQueues
} from '@reporter/core';
// import { OAuthTokenUpdateRefreshTokenSubscription } from './events/OAuthSubscriptions';

const PORT = process.env.PORT || 3000;

const startService = async () => {
  await connectDatabase().catch(err => {
    throw new DatabaseConnectionError('oauth-api failed to connect to database: ', err);
  });

  oAuthApp.listen(PORT, () => {
    console.log(`OAuth API service listening on port ${PORT}...`);
  });
};

connectToRabbitMQ().then(async (channel) => {
  // Subscribe to RabbitMQ to handle message events between microservices
  // await subscribeQueues(channel, [OAuthTokenUpdateRefreshTokenSubscription]);

  await startService();
}).catch((err) => {
  console.error('Error starting oauth-api:', err);
  process.exit(1);
});

process.on('SIGINT', async () => {
  await disconnectDatabase();
  await disconnectFromRabbitMQ();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDatabase();
  await disconnectFromRabbitMQ();
  process.exit(0);
});
