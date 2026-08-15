'use client';

import { Analytics } from '@vercel/analytics/react';

import { stripFragment } from '@/lib/codec';

/**
 * Anonymous page-view counts only.
 *
 * The `beforeSend` hook is load-bearing, not a nicety. Analytics tags build the
 * reported page URL from `document.location.href`, and on this site the part
 * after `#` is both people's answers in a form the client can decode. Without
 * this, every share link opened would hand the vendor a readable record of the
 * answers. Anything with a fragment is reported as the bare path instead.
 *
 * Cannot be inlined into the layout: `beforeSend` is a function prop, so it has
 * to cross into client-land here rather than from the server component.
 */
export function SiteAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => ({ ...event, url: stripFragment(event.url) })}
    />
  );
}
