/**
 * Packs a profile into a short, URL-safe string.
 *
 * This is deliberately the *only* transport in the app. The encoded profile
 * lives in the location fragment (`#p=…`), which browsers never send to the
 * server — so answers stay on the two devices involved even though the site
 * itself is served from a host.
 *
 * Layout:  1.<base64url name>.<one char per question, in QUESTION_ORDER>
 *
 * Each character holds an *index*, not a quantised value: the position in the
 * question's choice list, or the number of slider steps above its minimum. That
 * makes the round-trip exact, which matters — both people must see the identical
 * score, and a value-quantised codec shifted it by a point. `~` marks unanswered.
 */

import {
  NumberQuestion,
  Question,
  QUESTIONS_BY_ID,
  QUESTION_ORDER,
} from './questions';

export const CODEC_VERSION = '1';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const UNANSWERED = '~';

export const MAX_NAME_LENGTH = 24;

/** How many distinct indices a question can take. Must stay within the alphabet. */
const slotCount = (q: Question): number =>
  q.kind === 'number'
    ? Math.round(((q as NumberQuestion).max - (q as NumberQuestion).min) / (q as NumberQuestion).step) + 1
    : q.choices.length;

/** Answer value → index. Snaps to the nearest legal option. */
function toIndex(q: Question, raw: number): number {
  const last = slotCount(q) - 1;
  if (q.kind === 'number') {
    const n = q as NumberQuestion;
    return Math.min(last, Math.max(0, Math.round((raw - n.min) / n.step)));
  }
  let best = 0;
  for (let i = 1; i < q.choices.length; i++) {
    if (Math.abs(q.choices[i].value - raw) < Math.abs(q.choices[best].value - raw)) best = i;
  }
  return best;
}

/** Index → answer value. Exactly inverts `toIndex` for any legal answer. */
function fromIndex(q: Question, index: number): number | null {
  if (index < 0 || index >= slotCount(q)) return null;
  if (q.kind === 'number') {
    const n = q as NumberQuestion;
    return n.min + index * n.step;
  }
  return q.choices[index].value;
}

function encodeName(name: string): string {
  const trimmed = name.trim().slice(0, MAX_NAME_LENGTH);
  if (!trimmed) return '';
  const bytes = new TextEncoder().encode(trimmed);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeName(encoded: string): string {
  if (!encoded) return '';
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes).slice(0, MAX_NAME_LENGTH);
}

export interface EncodableProfile {
  name: string;
  answers: Record<string, number>;
}

export function encodeProfile(profile: EncodableProfile): string {
  const chars = QUESTION_ORDER.map((id) => {
    const raw = profile.answers[id];
    if (raw === undefined || Number.isNaN(raw)) return UNANSWERED;
    return ALPHABET[toIndex(QUESTIONS_BY_ID[id], raw)];
  }).join('');

  return `${CODEC_VERSION}.${encodeName(profile.name)}.${chars}`;
}

/** Returns null for anything malformed — a truncated link should not crash the page. */
export function decodeProfile(payload: string): EncodableProfile | null {
  if (!payload) return null;

  const parts = payload.split('.');
  if (parts.length !== 3) return null;

  const [version, encodedName, chars] = parts;
  if (version !== CODEC_VERSION) return null;
  if (chars.length !== QUESTION_ORDER.length) return null;

  let name: string;
  try {
    name = decodeName(encodedName);
  } catch {
    return null;
  }

  const answers: Record<string, number> = {};
  for (let i = 0; i < QUESTION_ORDER.length; i++) {
    const char = chars[i];
    if (char === UNANSWERED) continue;
    const index = ALPHABET.indexOf(char);
    if (index === -1) return null;
    const q = QUESTIONS_BY_ID[QUESTION_ORDER[i]];
    const value = fromIndex(q, index);
    // An index past the end of this question's options means the link was built
    // by a different version of the quiz — reject rather than guess.
    if (value === null) return null;
    answers[q.id] = value;
  }

  return { name, answers };
}

/** True when every question has an answer — the gate for sharing. */
export const isComplete = (answers: Record<string, number>): boolean =>
  QUESTION_ORDER.every((id) => answers[id] !== undefined);

/**
 * Removes the fragment — and therefore every answer — from a URL.
 *
 * This is the guard between the profile payload and anything that reports a
 * "page URL" outward. Analytics tags typically read `document.location.href`,
 * which includes the fragment, so a share link would otherwise be recorded as a
 * fully decodable copy of both people's answers. Everything after the first `#`
 * goes, query string and path kept.
 */
export function stripFragment(url: string): string {
  const cut = url.indexOf('#');
  return cut === -1 ? url : url.slice(0, cut);
}

/** Reads `#p=…` (or another key) off a URL fragment. */
export function readPayloadFromHash(hash: string, key = 'p'): string | null {
  const clean = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!clean) return null;
  return new URLSearchParams(clean).get(key);
}

const base = (origin: string, path: string) => `${origin.replace(/\/$/, '')}${path}`;

/** An invitation: one profile, for the other person to answer against. */
export function buildShareUrl(origin: string, path: string, payload: string): string {
  return `${base(origin, path)}#p=${payload}`;
}

/** A finished comparison, so the other person can see the same result without retaking. */
export function buildCompareUrl(
  origin: string,
  path: string,
  first: string,
  second: string,
): string {
  return `${base(origin, path)}#p=${first}&q=${second}`;
}
