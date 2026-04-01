/**
 * Entry / OAuth callback route aligned with `docs/authorization-flow.md`:
 *
 * @since app-login--JP
 */
import { redirect } from 'next/navigation';
import { handleStartPage } from '../../lib/start/HandleStartPage';

type StartSearchParams = {
  merchant_id?: string;
  /** Clover sometimes uses camelCase in redirect query strings. */
  merchantId?: string;
  client_id?: string;
  code?: string;
  state?: string;
};

export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<StartSearchParams>;
}) {
  const params = await searchParams;

  redirect(await handleStartPage(params));
}
