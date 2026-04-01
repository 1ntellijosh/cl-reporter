/**
 * Main entry point for auth microservice (auth-srv) setup and running
 *
 * @since auth-micro-start--JP
 */
import { oAuthApp } from './App';
import {
  DatabaseConnectionError
  // subscribeQueues
} from '@reporter/common';
import {
  connectToRabbitMQ,
  disconnectFromRabbitMQ,
  connectDatabase,
  disconnectDatabase 
} from '@reporter/middleware';
// import { OAuthTokenUpdateRefreshTokenSubscription } from './events/OAuthSubscriptions';

const PORT = process.env.PORT || 3000;

const startService = async () => {
  // Check for all required environment variables
  if (!process.env.CLOVER_OAUTH_TOKEN_BASE) {
    throw new Error('CLOVER_OAUTH_TOKEN_BASE is not set');
  }
  if (!process.env.CLOVER_CLIENT_ID) {
    throw new Error('CLOVER_CLIENT_ID is not set');
  }
  if (!process.env.CLOVER_CLIENT_SECRET) {
    throw new Error('CLOVER_CLIENT_SECRET is not set');
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  if (!process.env.RABBITMQ_URL) {
    throw new Error('RABBITMQ_URL is not set');
  }
  if (!process.env.CLOVER_TOKEN_ENCRYPTION_KEY) {
    throw new Error('CLOVER_TOKEN_ENCRYPTION_KEY is not set');
  }

  await connectDatabase().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    throw new DatabaseConnectionError('oauth-api failed to connect to database: ' + message);
  });

  oAuthApp.listen(PORT, () => {
    console.log(`OAuth API service listening on port ${PORT}...`);
  });
};

connectToRabbitMQ().then(async (channel) => {
  // Subscribe to RabbitMQ to handle message events between microservices
  // await subscribeQueues(channel, [OAuthTokenUpdateRefreshTokenSubscription]);

  await startService();
}).catch((err: unknown) => {
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
