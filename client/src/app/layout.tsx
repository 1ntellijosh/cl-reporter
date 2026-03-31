/**
 * Root layout (Server Component).
 *
 * @since app-skaffold--JP
 */
import { cookies } from 'next/headers';
import { APP_BILLING_STATUS_COOKIE_NAME } from '@reporter/common';
import { normalizeBillingStatus } from '../lib/billing/BillingStatus';
import Providers from './Providers';

export default async function RootLayout(props: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const raw = cookieStore.get(APP_BILLING_STATUS_COOKIE_NAME)?.value;
  const initialBillingStatus = normalizeBillingStatus(raw);

  return (
    <html lang="en">
      <body>
        <Providers initialBillingStatus={initialBillingStatus}>{props.children}</Providers>
      </body>
    </html>
  );
}
