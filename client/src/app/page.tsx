/**
 * Home page.
 *
 * @since app-login--JP
 */
import HomePageContent from './HomePageContent';
import { SessionModule } from '../lib/sessions/SessionModule';

export default async function HomePage() {
  const SessionPayload = await SessionModule.getAppSessionPayload();

  return <HomePageContent isLoggedIn={SessionPayload != null} />;
}