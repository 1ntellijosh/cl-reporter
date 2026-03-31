/**
 * Context is shared between all routes for subscription states and changes
 * 
 * @since app-login--JP
 */
'use client';

import { createContext, useContext, useLayoutEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { API, type BillingStatus } from '@reporter/common';
import { parseBillingStatusFromDocumentCookie } from '../lib/billing/BillingStatus';

type SubscriptionContextType = {
  billingStatus: BillingStatus;
  isFetching: boolean;
  dataUpdatedAt: number;
  clear: () => void;
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

async function fetchBillingStatus(): Promise<BillingStatus> {
  const resp = await API.auth.getCloverBillingInfo();
  return resp.billingStatus ?? null;
}

/**
 * Provides billingStatus from server (initial) + react-query (cache + refetch after signOut).
 * Use useSubscription() in any route (storefront, auth, admin).
 */
type SubscriptionProviderProps = {
  children: React.ReactNode;
  /** From root layout `cookies()` (preferred). Avoids hydration mismatch vs `document.cookie` alone. */
  initialBillingStatus?: BillingStatus | null;
};

export function SubscriptionProvider({
  children,
  initialBillingStatus = null,
}: SubscriptionProviderProps) {
  const queryClient = useQueryClient();
  const { data: billingStatus = null, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ['billingStatus'],
    queryFn: fetchBillingStatus,
    initialData: initialBillingStatus,
    staleTime: 60 * 1000,
  });

  useLayoutEffect(() => {
    if (initialBillingStatus != null) {
      return;
    }

    const fromDocument = parseBillingStatusFromDocumentCookie();

    if (fromDocument != null) {
      queryClient.setQueryData(['billingStatus'], fromDocument);
    }
  }, [initialBillingStatus, queryClient]);

  const clear = async () => {
    queryClient.setQueryData(['billingStatus'], null);
  };

  const value = useMemo(
    () => ({ billingStatus, isFetching, dataUpdatedAt, clear }),
    [billingStatus, isFetching, dataUpdatedAt, clear]
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (ctx === undefined) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }

  return ctx;
}
