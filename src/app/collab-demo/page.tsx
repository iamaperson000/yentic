import type { Metadata } from 'next';

import DemoClient from './DemoClient';

export const metadata: Metadata = {
  title: 'All in the Tab — Live Collaboration Demo',
  description: 'Open in two windows and type together. No login.',
};

export default function Page() {
  return <DemoClient />;
}
