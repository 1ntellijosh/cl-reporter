/**
 * OAuth service event subscriptions
 *
 * @since app-skaffold--JP
 */
import { ServiceSubscription, EventTypesEnum, TokenUpdateRefreshTokenData, ProcessedEventRepository } from '@reporter/core';
import { DELAYED_EXCHANGE_NAME, ConsumeIdempotently, AbstractProcessedEventRepository } from '@reporter/core';
// import { ProcessedEventsRepository } from '@reporter/core';

// const processedEventRepo = new AbstractProcessedEventRepository();

/**
 * Subscription for oauth-api to consume token update refresh token events
 */
export const OAuthTokenUpdateRefreshTokenSubscription : ServiceSubscription = {
  queueName: 'oauth-api.token-update-refresh-token',
  eventConsumers: {
    [EventTypesEnum.TOKEN_UPDATE_REFRESH_TOKEN]: {
      handler: async (envelope) => {
        // await ConsumeIdempotently(
        //   envelope,
        //   processedEventRepo,  
        //   async () => {
        //     const data = envelope.data as TokenUpdateRefreshTokenData;
        //     console.log('OAuth Service received TOKEN_UPDATE_REFRESH_TOKEN event')
        //     await oAuthService.onTokenUpdateRefreshTokenEvent(data);
        //   }
        // );
      },
      exchange: DELAYED_EXCHANGE_NAME,
    },
  },
};
