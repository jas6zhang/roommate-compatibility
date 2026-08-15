import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

import {
  buildShareUrl,
  decodeProfile,
  encodeProfile,
  isComplete,
  MAX_NAME_LENGTH,
  readPayloadFromHash,
  stripFragment,
} from '../lib/codec';
import { NumberQuestion, Question, QUESTIONS, QUESTION_ORDER } from '../lib/questions';
import { score } from '../lib/scoring';

const mid = (q: Question) =>
  q.kind === 'number' ? ((q as NumberQuestion).min + (q as NumberQuestion).max) / 2 : 0.5;

const build = (name: string, pick: (q: Question) => number) => ({
  name,
  answers: Object.fromEntries(QUESTIONS.map((q) => [q.id, pick(q)])),
});

describe('encodeProfile / decodeProfile', () => {
  it('round-trips every declared choice value', () => {
    const answers: Record<string, number> = {};
    for (const q of QUESTIONS) {
      answers[q.id] = q.kind === 'number' ? 71 : q.choices[q.choices.length - 1].value;
    }

    const decoded = decodeProfile(encodeProfile({ name: 'Ana', answers }))!;
    assert.ok(decoded);
    for (const q of QUESTIONS) {
      // Exact, not approximate: indices are encoded, never quantised values.
      assert.equal(decoded.answers[q.id], answers[q.id], `${q.id} did not survive`);
    }
  });

  it('round-trips every option of every choice question exactly', () => {
    for (const q of QUESTIONS) {
      if (q.kind === 'number') continue;
      for (const choice of q.choices) {
        const decoded = decodeProfile(
          encodeProfile({ name: 'Ana', answers: { [q.id]: choice.value } }),
        );
        assert.ok(decoded, `${q.id} / ${choice.label} failed to decode`);
        assert.equal(decoded.answers[q.id], choice.value, `${q.id} / ${choice.label}`);
      }
    }
  });

  it('encoding never moves the compatibility score', () => {
    // Both people must see the same number, so a share link has to be lossless
    // for every answer the UI can actually produce.
    const a = build('Ana', mid);
    for (const step of [0, 1, 2, 3, 4]) {
      const b = {
        name: 'Ben',
        answers: Object.fromEntries(
          QUESTIONS.map((q) => [
            q.id,
            q.kind === 'number'
              ? Math.min(q.max, q.min + step * 3)
              : q.choices[Math.min(step, q.choices.length - 1)].value,
          ]),
        ),
      };

      const roundTripped = decodeProfile(encodeProfile(b));
      assert.ok(roundTripped);
      assert.equal(
        score(a, b).overall,
        score(a, roundTripped).overall,
        `score drifted at option ${step}`,
      );
    }
  });

  it('snaps a value that is not a legal option to the nearest one', () => {
    // life_smoke offers 0 / 0.4 / 0.75 / 1 — 0.3 is not on the list.
    const decoded = decodeProfile(encodeProfile({ name: 'Ana', answers: { life_smoke: 0.3 } }));
    assert.ok(decoded);
    assert.equal(decoded.answers['life_smoke'], 0.4);
  });

  it('round-trips every whole degree on the thermostat', () => {
    for (let t = 60; t <= 80; t++) {
      const decoded = decodeProfile(encodeProfile({ name: 'Ana', answers: { temp_pref: t } }))!;
      assert.equal(decoded.answers['temp_pref'], t, `temperature ${t} did not survive`);
    }
  });

  it('round-trips a unicode name', () => {
    const decoded = decodeProfile(encodeProfile({ name: 'Zoë 🏠', answers: {} }))!;
    assert.equal(decoded.name, 'Zoë 🏠');
  });

  it('handles an empty name', () => {
    const decoded = decodeProfile(encodeProfile({ name: '', answers: {} }))!;
    assert.equal(decoded.name, '');
  });

  it('truncates an overlong name', () => {
    const decoded = decodeProfile(encodeProfile({ name: 'x'.repeat(200), answers: {} }))!;
    assert.equal(decoded.name.length, MAX_NAME_LENGTH);
  });

  it('preserves which questions were left unanswered', () => {
    const decoded = decodeProfile(encodeProfile({ name: 'Ana', answers: { sleep_bed: 1 } }))!;
    assert.equal(decoded.answers['sleep_bed'], 1);
    assert.equal(decoded.answers['clean_dishes'], undefined);
    assert.equal(Object.keys(decoded.answers).length, 1);
  });

  it('produces a URL-safe payload needing no escaping', () => {
    const payload = encodeProfile(build('Ana', mid));
    assert.equal(encodeURIComponent(payload), payload);
  });

  it('stays short enough to send in a text message', () => {
    const payload = encodeProfile(build('Alexandra', mid));
    assert.ok(payload.length < 80, `payload was ${payload.length} chars`);
  });
});

describe('decodeProfile rejects bad input', () => {
  const good = encodeProfile(build('Ana', mid));

  const cases: [string, string][] = [
    ['empty string', ''],
    ['no separators', 'garbage'],
    ['too few parts', '1.QW5h'],
    ['too many parts', `${good}.extra`],
    ['unknown version', `9${good.slice(1)}`],
    ['truncated answers', good.slice(0, -3)],
    ['overlong answers', `${good}AAA`],
    ['illegal answer char', `${good.slice(0, -1)}!`],
    ['corrupt name', '1.!!!!.' + 'A'.repeat(QUESTION_ORDER.length)],
    // sleep_bed has 5 options, so index 5 ('F') came from a different question set.
    ['index past a question\'s options', good.replace(/\.[^.]*$/, (chars) => '.F' + chars.slice(2))],
  ];

  for (const [label, payload] of cases) {
    it(`returns null for ${label}`, () => {
      assert.equal(decodeProfile(payload), null);
    });
  }

  it('accepts a well-formed payload', () => {
    assert.notEqual(decodeProfile(good), null);
  });
});

describe('stripFragment', () => {
  // This is what stands between the answers and any analytics payload, so it is
  // tested against real share links rather than toy strings.
  it('removes a real share link payload entirely', () => {
    const payload = encodeProfile(build('Ana', mid));
    const url = buildShareUrl('https://example.com', '/', payload);

    assert.equal(stripFragment(url), 'https://example.com/');
    assert.ok(!stripFragment(url).includes('#'));
    assert.ok(!stripFragment(url).includes(payload));
  });

  it('removes a two-profile comparison payload entirely', () => {
    const a = encodeProfile(build('Ana', mid));
    const b = encodeProfile(build('Ben', (q) => (q.kind === 'number' ? 74 : 1)));
    const url = `https://example.com/#p=${a}&q=${b}`;

    const stripped = stripFragment(url);
    assert.equal(stripped, 'https://example.com/');
    assert.ok(!stripped.includes(a) && !stripped.includes(b));
  });

  it('leaves a url with no fragment untouched', () => {
    assert.equal(stripFragment('https://example.com/embed/'), 'https://example.com/embed/');
  });

  it('keeps the path and query, drops only the fragment', () => {
    assert.equal(
      stripFragment('https://example.com/embed/?utm_source=x#p=SECRET'),
      'https://example.com/embed/?utm_source=x',
    );
  });

  it('cuts at the first # even when the payload contains more', () => {
    assert.equal(stripFragment('https://example.com/#p=A#B#C'), 'https://example.com/');
  });

  it('handles a bare fragment and an empty string', () => {
    assert.equal(stripFragment('#p=SECRET'), '');
    assert.equal(stripFragment(''), '');
  });

  it('is what the analytics hook actually applies', async () => {
    // Guards against the hook being dropped or rewired to pass event.url through.
    const source = await readFile(new URL('../components/SiteAnalytics.tsx', import.meta.url), 'utf8');
    assert.match(source, /beforeSend/);
    assert.match(source, /stripFragment\(event\.url\)/);
  });
});

describe('isComplete', () => {
  it('is false while any question is unanswered', () => {
    const answers = Object.fromEntries(QUESTION_ORDER.slice(1).map((id) => [id, 0.5]));
    assert.equal(isComplete(answers), false);
  });

  it('is true once every question has an answer', () => {
    assert.equal(isComplete(build('Ana', mid).answers), true);
  });
});

describe('url helpers', () => {
  it('reads the payload out of a hash', () => {
    assert.equal(readPayloadFromHash('#p=1.QW5h.ABC'), '1.QW5h.ABC');
    assert.equal(readPayloadFromHash('p=1.QW5h.ABC'), '1.QW5h.ABC');
    assert.equal(readPayloadFromHash(''), null);
    assert.equal(readPayloadFromHash('#other=1'), null);
  });

  it('builds a share url with the payload in the fragment', () => {
    const url = buildShareUrl('https://example.com/', '/', 'PAYLOAD');
    assert.equal(url, 'https://example.com/#p=PAYLOAD');
    assert.equal(new URL(url).search, '', 'payload must never land in the query string');
    assert.equal(new URL(url).hash, '#p=PAYLOAD');
  });
});
