/**
 * Checks the incoming message for idempotency, and if it is not already processed, runs the handler and marks it as
 * processed.
 *
 * @since app-skaffold--JP
 */
import { EventEnvelope } from '../contracts/EventContracts';
import { AbstractProcessedEventRepository } from '../abstracts/AbstractProcessedEventRepository';

export async function consumeIdempotently(
  envelope: EventEnvelope,
  processedEventRepo: AbstractProcessedEventRepository,
  handler: () => Promise<void>
): Promise<void> {
  const eventId = envelope.metadata?.eventId;
  if (!eventId || await processedEventRepo.isProcessed(eventId)) {
    return;
  }
  await handler();
  await processedEventRepo.markProcessed(eventId);
}
