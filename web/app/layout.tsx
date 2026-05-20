import './globals.css';
import { ReactNode } from 'react';
import { Providers } from './providers';

export const metadata = {
  title: 'Haqooq Admin Panel',
  description: 'Enterprise-grade governance, transparency, and legal operations for Haqooq.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}