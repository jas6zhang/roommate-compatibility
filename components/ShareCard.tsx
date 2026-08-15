'use client';

import { useEffect, useState } from 'react';

import { useCanShare } from '@/lib/browser';

/** Clipboard API needs a secure context; fall back to selecting the field. */
async function copy(text: string, input: HTMLInputElement | null): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    input?.select();
    return false;
  }
}

export function ShareCard({
  url,
  title,
  blurb,
  message,
}: {
  url: string;
  title: string;
  blurb: string;
  message: string;
}) {
  const [state, setState] = useState<'idle' | 'copied' | 'manual'>('idle');
  const [input, setInput] = useState<HTMLInputElement | null>(null);
  const canShare = useCanShare();

  useEffect(() => {
    if (state === 'idle') return;
    const t = setTimeout(() => setState('idle'), 2600);
    return () => clearTimeout(t);
  }, [state]);

  const body = `${message}\n\n${url}`;

  return (
    <section className="share">
      <h2 className="share__title">{title}</h2>
      <p className="share__blurb">{blurb}</p>

      <div className="share__row">
        <input
          ref={setInput}
          id="share-url"
          name="share-url"
          className="share__url"
          value={url}
          readOnly
          aria-label="Your shareable link"
          onFocus={(e) => e.currentTarget.select()}
        />
        <button
          type="button"
          className="btn btn--primary"
          onClick={async () => setState((await copy(url, input)) ? 'copied' : 'manual')}
        >
          {state === 'copied' ? 'Copied' : 'Copy link'}
        </button>
      </div>

      <p className="share__status" role="status">
        {state === 'copied' && 'Link copied to your clipboard.'}
        {state === 'manual' &&
          'Could not reach the clipboard — the link is selected, press Ctrl/Cmd+C.'}
      </p>

      <div className="share__buttons">
        {canShare && (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => navigator.share({ title, text: message, url }).catch(() => {})}
          >
            Share…
          </button>
        )}
        <a className="btn btn--ghost" href={`sms:?&body=${encodeURIComponent(body)}`}>
          Text it
        </a>
        <a
          className="btn btn--ghost"
          href={`https://wa.me/?text=${encodeURIComponent(body)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          WhatsApp
        </a>
        <a
          className="btn btn--ghost"
          href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`}
        >
          Email
        </a>
      </div>

      <p className="share__privacy">
        Everything is packed into the part of the link after the <code>#</code>, which
        browsers never send to a server. Whoever holds the link holds the answers — so
        send it to people, not to public timelines.
      </p>
    </section>
  );
}
