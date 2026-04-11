import './globals.css';

import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import type { Metadata } from 'next';

import { CommandPalette } from '@/components/CommandPalette';
import SessionWrapper from '@/components/SessionWrapper';

export const metadata: Metadata = {
  title: 'Yentic — Classic Web IDE',
  description: 'A clean, fast, collaborative-ready web IDE (no AI bloat).',
  metadataBase: new URL('http://localhost:3000'),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen antialiased font-sans">
        <SessionWrapper>
          <CommandPalette />
          {children}
        </SessionWrapper>
      </body>
    </html>
  );
}
