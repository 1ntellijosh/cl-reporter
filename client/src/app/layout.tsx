/**
 * Root layout (Server Component).
 *
 * @since app-skaffold--JP
 */
import Providers from './Providers';

export default async function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{props.children}</Providers>
      </body>
    </html>
  );
}
