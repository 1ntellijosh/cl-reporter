import type { ReactNode } from 'react';
export const metadata = {
  title: 'cl-reporter',
  description: 'Clover custom reports',
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
