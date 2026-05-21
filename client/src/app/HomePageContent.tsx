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
  const { billingStatus, clear } = useSubscription();

  const onLogoutClick = async () => {
    await RequestMaker.post('/api/auth/logout', []);
    await clear();
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
        <Button
          component={Link}
          href={CL_ROUTES.OAUTH_START}
          variant="contained"
          disableElevation
          sx={{
            mt: 2,
            color: '#fff',
            fontWeight: 700,
            textTransform: 'uppercase',
            borderRadius: '6px',
            border: '1px solid #c45c00',
            background: 'linear-gradient(180deg, #f5d76e 0%, #f7941d 45%, #e65c00 100%)',
            boxShadow: 'none',
            px: 5,
            py: 1.25,
            '&:hover': {
              background: 'linear-gradient(180deg, #f0cc55 0%, #ef8510 45%, #d95400 100%)',
              boxShadow: 'none',
            },
          }}
        >
          Login
        </Button>
      )}
    </Container>
  );
}
