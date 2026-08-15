'use client';

import { useSyncExternalStore } from 'react';

/**
 * Bridges the three pieces of browser state this app reads — the URL fragment,
 * the saved profile, and the theme — into React.
 *
 * These are genuinely external stores, so they go through `useSyncExternalStore`
 * rather than a mount effect. That gets hydration right for free (the prerendered
 * HTML uses the server snapshot, then React re-renders with the real value) and
 * keeps the components free of setState-in-effect.
 *
 * Every `getSnapshot` here must return a *stable* reference between changes, or
 * React will re-render forever — hence the caches.
 */

export type Theme = 'light' | 'dark';

const noop = () => () => {};

// ── URL fragment ───────────────────────────────────────────────────────────

const subscribeHash = (onChange: () => void) => {
  // Pasting a link into an open tab, or back/forward between two links, changes
  // only the fragment — no reload fires.
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
};

export const useHash = (): string =>
  useSyncExternalStore(
    subscribeHash,
    () => window.location.hash,
    () => '',
  );

// ── Origin (never changes, but still needs a client-only read) ─────────────

let originCache: string | null = null;

export const useOrigin = (): string =>
  useSyncExternalStore(
    noop,
    () => (originCache ??= window.location.origin + window.location.pathname),
    () => '',
  );

// ── Capability detection ───────────────────────────────────────────────────

/** Whether the OS share sheet is available. Server-renders as false. */
export const useCanShare = (): boolean =>
  useSyncExternalStore(
    noop,
    () => typeof navigator.share === 'function',
    () => false,
  );

// ── Saved profile ──────────────────────────────────────────────────────────

const PROFILE_KEY = 'rc.profile.v1';
const PROFILE_EVENT = 'rc:profile';

export interface StoredProfile {
  name: string;
  answers: Record<string, number>;
}

let profileRaw: string | null = null;
let profileCache: StoredProfile | null = null;
let profileRead = false;

function parseProfile(raw: string | null): StoredProfile | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredProfile;
    if (typeof parsed?.name !== 'string' || typeof parsed?.answers !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function readProfile(): StoredProfile | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(PROFILE_KEY);
  } catch {
    return null; // storage blocked; the session still works, it just is not remembered
  }
  // Re-parsing on every call would hand React a fresh object each time and spin.
  if (profileRead && raw === profileRaw) return profileCache;
  profileRaw = raw;
  profileCache = parseProfile(raw);
  profileRead = true;
  return profileCache;
}

const subscribeProfile = (onChange: () => void) => {
  window.addEventListener(PROFILE_EVENT, onChange);
  window.addEventListener('storage', onChange); // another tab
  return () => {
    window.removeEventListener(PROFILE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
};

export const useSavedProfile = (): StoredProfile | null =>
  useSyncExternalStore(subscribeProfile, readProfile, () => null);

export function saveProfile(profile: StoredProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Private browsing. Keep the in-memory copy so this session still works.
    profileRaw = null;
  }
  profileCache = profile;
  profileRead = true;
  profileRaw = (() => {
    try {
      return localStorage.getItem(PROFILE_KEY);
    } catch {
      return null;
    }
  })();
  window.dispatchEvent(new Event(PROFILE_EVENT));
}

// ── Theme ──────────────────────────────────────────────────────────────────

const THEME_KEY = 'rc.theme';
const THEME_EVENT = 'rc:theme';

const subscribeTheme = (onChange: () => void) => {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', onChange);
  window.addEventListener(THEME_EVENT, onChange);
  return () => {
    media.removeEventListener('change', onChange);
    window.removeEventListener(THEME_EVENT, onChange);
  };
};

/** The inline script in the layout already stamped any saved choice before paint. */
function readTheme(): Theme {
  const stamped = document.documentElement.getAttribute('data-theme');
  if (stamped === 'dark' || stamped === 'light') return stamped;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const useTheme = (): Theme =>
  useSyncExternalStore(subscribeTheme, readTheme, () => 'light');

export function setTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // The toggle still works for this session.
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}
