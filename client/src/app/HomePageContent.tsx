/**
 * Home page content.
 *
 * @since app-login--JP
 */
'use client';

import { useRouter } from 'next/navigation';
import { Button, Container, Link, Typography, Box } from '@mui/material';
import { CL_ROUTES } from '../lib/enums/ClientRoutes';
import { RequestMaker } from '@reporter/common';
import { useSubscription } from '../state/SubscriptionContext';

export default function HomePageContent({ isLoggedIn }: { isLoggedIn: boolean }) {
  const router = useRouter();
  const { billingStatus } = useSubscription();

  const onLogoutClick = async () => {
    await RequestMaker.post('/api/auth/logout', []);
    router.push('/');
    router.refresh();
  };

  return (
    <Container>
      <Typography variant="h1">Home</Typography>
      <Typography variant="body1">(Next.js) — scaffold for local Kind / Skaffold builds.</Typography>
      {isLoggedIn ? (
        <>
          <Typography sx={{ mt: 2 }} variant="body1">Billing Status: {billingStatus}</Typography>
          <Box sx={{ mt: 2 }}>
            Go to <Link href={CL_ROUTES.REPORTS_DASHBOARD}>Dashboard</Link>
          </Box>
          <br />
          <Button sx={{ mt: 2 }} variant="contained" color="primary" onClick={onLogoutClick}>
            Log Out
          </Button>
        </>
      ) : (
        <Link href={CL_ROUTES.OAUTH_START}>Login</Link>
      )}
    </Container>
  );
}
