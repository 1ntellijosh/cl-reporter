'use client';

import { useState, useEffect } from 'react';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import { getTheme, type ThemeMode } from './theme';
import { LS_KEYS, LocalStore } from '../lib/localstorage/LocalStore';
import { type BillingStatus } from '@reporter/common';
import { SubscriptionProvider } from '../state/SubscriptionContext';

const queryClient = new QueryClient();

type ProvidersProps = {
  children: React.ReactNode;
  /** Seeded from server `cookies()` so first paint matches OAuth redirect without waiting on React Query. */
  initialBillingStatus?: BillingStatus | null;
};

/**
 * Client-only wrapper: theme state, theme toggle (all routes), and core providers.
 */
export default function Providers({
  children,
  initialBillingStatus = null,
}: ProvidersProps) {
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    let storedTheme = LocalStore.getItem(LS_KEYS.THEME_MODE) as ThemeMode | null;
    if (!storedTheme) {
      storedTheme = 'light';
      LocalStore.setItem(LS_KEYS.THEME_MODE, storedTheme);
    }
    setCurrentTheme(storedTheme);
  }, [mounted]);

  const toggleTheme = () => {
    const next: ThemeMode = currentTheme === 'light' ? 'dark' : 'light';
    setCurrentTheme(next);
    LocalStore.setItem(LS_KEYS.THEME_MODE, next);
  };

  // Use default 'light' until mounted so server and first client paint match (avoids hydration mismatch).
  const effectiveTheme = mounted ? currentTheme : 'light';
  const theme = getTheme(effectiveTheme);
  const footerHeight = '50px';

  return (
    <QueryClientProvider client={queryClient}>
      <AppRouterCacheProvider options={{ enableCssLayer: true }}>
        <SubscriptionProvider initialBillingStatus={initialBillingStatus}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <Box component="main" sx={{ position: 'relative', minHeight: '100vh', paddingBottom: footerHeight }}>
              {children}
            </Box>

            <Box sx={{
              position: 'fixed',
               bottom: 0,
               right: 0,
               width: '100%',
               height: footerHeight,
               zIndex: 1,
               backgroundColor: theme.palette.background.default,
               borderRadius: 1,
               p: 1,
              }}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={effectiveTheme === 'dark'}
                    onChange={toggleTheme}
                    color="default"
                    aria-label="toggle dark mode"
                  />
                }
                label={effectiveTheme === 'dark' ? 'Dark' : 'Light'}
                sx={{ position: 'fixed', bottom: 8, right: 0, zIndex: 1, mr: '8px' }}
              />
            </Box>
          </ThemeProvider>
        </SubscriptionProvider>
      </AppRouterCacheProvider>
    </QueryClientProvider>
  );
}
