'use client';

import { useMemo, useState } from 'react';

import {
  saveProfile,
  StoredProfile,
  useHash,
  useOrigin,
  useSavedProfile,
} from '@/lib/browser';
import {
  buildCompareUrl,
  buildShareUrl,
  decodeProfile,
  EncodableProfile,
  encodeProfile,
  isComplete,
  readPayloadFromHash,
} from '@/lib/codec';
import { Profile, score } from '@/lib/scoring';

import { DraftProfile, Quiz } from './Quiz';
import { Results } from './Results';
import { ShareCard } from './ShareCard';
import { ThemeToggle } from './ThemeToggle';

type View =
  | { kind: 'intro' }
  | { kind: 'quiz' }
  | { kind: 'mine' }
  | { kind: 'compare'; a: Profile; b: Profile };

const named = (p: EncodableProfile, fallback: string): Profile => ({
  name: p.name.trim() || fallback,
  answers: p.answers,
});

const usable = (p: StoredProfile | null): p is StoredProfile =>
  p !== null && isComplete(p.answers);

/**
 * Where the app should be, given only the link and whatever is saved on this
 * device. Pure, so it needs no effect and stays correct when the hash changes.
 */
function routeFor(hash: string, saved: StoredProfile | null) {
  const first = readPayloadFromHash(hash, 'p');
  const second = readPayloadFromHash(hash, 'q');

  // A finished comparison shared back — render it as-is, no quiz needed.
  if (first && second) {
    const a = decodeProfile(first);
    const b = decodeProfile(second);
    if (a && b) {
      return {
        invite: null,
        view: { kind: 'compare', a: named(a, 'Them'), b: named(b, 'You') } as View,
      };
    }
  }

  if (first) {
    const a = decodeProfile(first);
    if (a) {
      const invite = named(a, 'Your roommate');
      // Already answered on this device? Go straight to the comparison.
      const view: View = usable(saved)
        ? { kind: 'compare', a: invite, b: { name: saved.name || 'You', answers: saved.answers } }
        : { kind: 'intro' };
      return { invite, view };
    }
  }

  return { invite: null, view: (usable(saved) ? { kind: 'mine' } : { kind: 'intro' }) as View };
}

export function App({ embedded = false }: { embedded?: boolean }) {
  const hash = useHash();
  const origin = useOrigin();
  const saved = useSavedProfile();

  /** A view the user navigated to by hand, valid only for the current link. */
  const [override, setOverride] = useState<{ hash: string; view: View } | null>(null);

  const { invite, view: routed } = useMemo(() => routeFor(hash, saved), [hash, saved]);
  const view = override && override.hash === hash ? override.view : routed;

  const go = (next: View) => setOverride({ hash, view: next });
  const retake = () => go({ kind: 'quiz' });

  const finish = (profile: DraftProfile) => {
    saveProfile(profile);
    go(
      invite
        ? { kind: 'compare', a: invite, b: { name: profile.name || 'You', answers: profile.answers } }
        : { kind: 'mine' },
    );
  };

  const myPayload = saved ? encodeProfile(saved) : '';

  return (
    <main className={`shell${embedded ? ' shell--embedded' : ''}`}>
      {!embedded && (
        <header className="topbar">
          <span className="topbar__mark">Roommate Compatibility</span>
          <ThemeToggle />
        </header>
      )}

      {view.kind === 'intro' && (
        <>
          <section className="intro">
            <h1 className="intro__title">
              {invite ? (
                <>
                  {invite.name} wants to know
                  <br />
                  if you&rsquo;d live well together.
                </>
              ) : (
                <>
                  Will you live
                  <br />
                  well together?
                </>
              )}
            </h1>
            <p className="intro__lede">
              {invite
                ? `Answer the same 26 questions ${invite.name} did. You'll both see exactly where you line up and where you don't — before anyone signs a lease.`
                : 'Twenty-six questions about sleep, mess, guests, the thermostat, noise, chores, money and everything else roommates actually fight about. Then send the link to someone and compare.'}
            </p>
            <button type="button" className="btn btn--primary btn--lg" onClick={retake}>
              {invite ? 'Answer the questions' : 'Start the quiz'}
            </button>
            <ul className="intro__points">
              <li>Takes about four minutes</li>
              <li>No account, no email, no database</li>
              <li>Your answers never leave your browser</li>
            </ul>
          </section>

          {usable(saved) && (
            <p className="intro__resume">
              You already answered as <strong>{saved.name}</strong>.{' '}
              <button
                type="button"
                className="linkish"
                onClick={() =>
                  go(
                    invite
                      ? {
                          kind: 'compare',
                          a: invite,
                          b: { name: saved.name || 'You', answers: saved.answers },
                        }
                      : { kind: 'mine' },
                  )
                }
              >
                Use those answers
              </button>
            </p>
          )}
        </>
      )}

      {view.kind === 'quiz' && (
        <Quiz
          initial={saved ?? undefined}
          invitedBy={invite?.name}
          onComplete={finish}
          onCancel={() => go({ kind: 'intro' })}
        />
      )}

      {view.kind === 'mine' && saved && (
        <section className="done">
          <h1 className="done__title">Your answers are saved, {saved.name}.</h1>
          <p className="done__lede">
            Send this link to anyone you might live with. When they finish, they see the
            comparison instantly — and can send it straight back to you.
          </p>

          <ShareCard
            url={buildShareUrl(origin, '', myPayload)}
            title="Your invite link"
            blurb="Everything needed to compare is inside the link itself."
            message="I did a roommate compatibility quiz — answer the same questions and we'll see how we'd actually live together."
          />

          <div className="done__actions">
            <button type="button" className="btn btn--ghost" onClick={retake}>
              Change my answers
            </button>
          </div>
        </section>
      )}

      {view.kind === 'compare' && (
        <Results result={score(view.a, view.b)} a={view.a} b={view.b}>
          <ShareCard
            url={buildCompareUrl(origin, '', encodeProfile(view.a), encodeProfile(view.b))}
            title={`Send this result to ${view.a.name}`}
            blurb="This link contains both sets of answers, so they see exactly what you see."
            message={`Here's how ${view.a.name} and ${view.b.name} scored as roommates.`}
          />

          <div className="done__actions">
            <button type="button" className="btn btn--ghost" onClick={retake}>
              Change my answers
            </button>
            <a className="btn btn--ghost" href={origin || '/'}>
              Start fresh
            </a>
          </div>
        </Results>
      )}

      {!embedded && (
        <footer className="footer">
          <p>
            Your answers are encoded in the part of the link after the <code>#</code>,
            which browsers never send to a server. They are never stored, logged, or
            shared, and no account is involved.
          </p>
          <p>
            Anonymous visit counts are measured, without cookies. The link is stripped
            back to the bare page address first, so no answers are ever part of that.
          </p>
        </footer>
      )}
    </main>
  );
}
