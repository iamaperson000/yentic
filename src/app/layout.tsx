import './globals.css';

import { Bricolage_Grotesque, Hanken_Grotesk, JetBrains_Mono } from 'next/font/google';
import type { Metadata } from 'next';

import { CommandPalette } from '@/components/CommandPalette';
import HideLiveblocksBadge from '@/components/HideLiveblocksBadge';
import SessionWrapper from '@/components/SessionWrapper';

const display = Bricolage_Grotesque({ subsets: ['latin'], weight: ['500', '700', '800'], variable: '--font-display' });
const body = Hanken_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-body' });
const monoCode = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-mono-code' });

export const metadata: Metadata = {
  title: 'All in the Tab — a real IDE in your browser',
  description: 'Write, run, and share code — all in a browser tab. Python, C, C++, Java, and web, no install.',
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? 'http://localhost:3000'),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme="dusk"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} ${monoCode.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('yentic-theme');document.documentElement.dataset.theme=(t==='daylight'||t==='dusk')?t:'dusk';}catch(e){}",
          }}
        />
      </head>
      <body className="min-h-screen antialiased" style={{ fontFamily: 'var(--font-body)' }}>
        <SessionWrapper>
          <HideLiveblocksBadge />
          <CommandPalette />
          {children}
        </SessionWrapper>
      </body>
    </html>
  );
}
