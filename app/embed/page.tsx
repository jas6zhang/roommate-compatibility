import type { Metadata } from 'next';

import { App } from '@/components/App';

export const metadata: Metadata = {
  title: 'Roommate Compatibility',
  // An embedded copy inside someone else's page should not compete with the real
  // page in search results.
  robots: { index: false, follow: false },
};

/**
 * The iframe-friendly route: same quiz, no site chrome, sized to fit whatever
 * container it is dropped into.
 */
export default function EmbedPage() {
  return <App embedded />;
}
