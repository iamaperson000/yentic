import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Yentic — Classic Web IDE',
  description: 'A clean, fast, collaborative-ready web IDE (no AI bloat).',
  metadataBase: new URL('http://localhost:3000'),
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
