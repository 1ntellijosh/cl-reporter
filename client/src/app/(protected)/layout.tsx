/**
 * Layout for (protected) routes.
 *
 * @since app-login--JP
 */
import Box from '@mui/material/Box';
import { redirect } from 'next/navigation';
import { CL_ROUTES } from '../../lib/enums/ClientRoutes';
import { SessionModule } from '../../lib/sessions/SessionModule';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const SessionPayload = await SessionModule.getAppSessionPayload();

  /**
   * All routes inside this layout are session protected. Therefore, if the user is not logged in, redirect to the oauth
   * start page.
   */
  if (!SessionPayload) {
    redirect(CL_ROUTES.OAUTH_START);
  }

  return (
    <Box component="main" sx={{ height: '100%', width: '100%' }}>
      {children}
    </Box>
  );
}
