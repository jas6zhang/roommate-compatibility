import type { Metadata, Viewport } from 'next';

import { SiteAnalytics } from '@/components/SiteAnalytics';

import './globals.css';
import './ui.css';

/**
 * Only used to make the link-preview tags absolute. Vercel injects its own
 * production hostname at build time, so this stays correct whatever the project
 * ends up being called.
 */
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'https://roommate-compatibility.vercel.app');

const OG_ALT = 'Roommate Compatibility — will you live well together?';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Will you live well together? — Roommate Compatibility',
  description:
    'A 26-question roommate compatibility check covering sleep, cleanliness, guests, temperature, noise, chores, lifestyle and money. Answers stay in your browser — nothing is ever sent to a server.',
  applicationName: 'Roommate Compatibility',
  openGraph: {
    type: 'website',
    url: SITE_URL,
    title: 'Will you live well together?',
    siteName: 'Roommate Compatibility',
    description:
      'Answer 26 questions, send the link to a prospective roommate, and see where you actually differ — sleep, mess, guests, the thermostat, noise and money.',
    // Generic by design. A share link carries both people's answers in its
    // fragment and the preview is fetched by the messaging app, so this image
    // must never be derived from a profile.
    images: [{ url: '/og.png', width: 1200, height: 630, alt: OG_ALT }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Will you live well together?',
    description:
      'A roommate compatibility check you can send to anyone. No accounts, no server, answers never leave your browser.',
    images: [{ url: '/og.png', alt: OG_ALT }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f9f9f7' },
    { media: '(prefers-color-scheme: dark)', color: '#0d0d0d' },
  ],
};

/**
 * Applies the saved theme before first paint so a dark-mode visitor never sees a
 * white flash. Kept tiny and dependency-free on purpose.
 */
const THEME_INIT = `try{var t=localStorage.getItem('rc.theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t)}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>
        {children}
        <SiteAnalytics />
      </body>
    </html>
  );
}
