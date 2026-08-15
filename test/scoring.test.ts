import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NumberQuestion, Question, QUESTIONS } from '../lib/questions';
import { DEAL_BREAKER_CAP, Profile, score } from '../lib/scoring';

const low = (q: Question) => (q.kind === 'number' ? (q as NumberQuestion).min : 0);
const high = (q: Question) => (q.kind === 'number' ? (q as NumberQuestion).max : 1);
const mid = (q: Question) =>
  q.kind === 'number' ? ((q as NumberQuestion).min + (q as NumberQuestion).max) / 2 : 0.5;

const build = (name: string, pick: (q: Question) => number): Profile => ({
  name,
  answers: Object.fromEntries(QUESTIONS.map((q) => [q.id, pick(q)])),
});

const withAnswers = (p: Profile, overrides: Record<string, number>): Profile => ({
  ...p,
  answers: { ...p.answers, ...overrides },
});

const axis = (result: ReturnType<typeof score>, id: string) =>
  result.axes.find((a) => a.axis === id)!;

describe('score', () => {
  it('gives identical profiles a perfect score', () => {
    const a = build('Ana', mid);
    const b = build('Ben', mid);
    const result = score(a, b);

    assert.equal(result.overall, 100);
    assert.equal(result.band.tone, 'good');
    assert.ok(result.axes.every((ax) => ax.score === 100));
  });

  it('gives opposite profiles the floor score', () => {
    const result = score(build('Ana', low), build('Ben', high));

    assert.equal(result.overall, 0);
    assert.equal(result.band.tone, 'critical');
  });

  it('is forgiving of a single notch of difference', () => {
    const a = build('Ana', mid);
    const b = withAnswers(build('Ben', mid), { sleep_bed: 0.75 }); // one notch from 0.5

    const result = score(a, b);
    // Two preference questions on the axis: one perfect, one a notch off.
    assert.ok(
      axis(result, 'sleep').score >= 85,
      `expected a forgiving sleep score, got ${axis(result, 'sleep').score}`,
    );
    assert.ok(axis(result, 'sleep').score < 100);
  });

  it('punishes a gap more when both people care about that axis', () => {
    const gap = { noise_level: 0, noise_quiet: 0 };
    const base = build('Ana', mid);

    const bothCare = score(
      withAnswers(base, { ...gap, noise_bother: 1 }),
      withAnswers(build('Ben', mid), { noise_bother: 1 }),
    );
    const neitherCares = score(
      withAnswers(base, { ...gap, noise_bother: 0 }),
      withAnswers(build('Ben', mid), { noise_bother: 0 }),
    );

    // Same disagreement, different stakes.
    assert.equal(axis(bothCare, 'noise').score, axis(neitherCares, 'noise').score);
    assert.ok(
      bothCare.overall < neitherCares.overall,
      `${bothCare.overall} should be below ${neitherCares.overall}`,
    );
    assert.equal(axis(bothCare, 'noise').importance, 'high');
    assert.equal(axis(neitherCares, 'noise').importance, 'low');
  });

  it('takes the higher of the two sensitivities, not the average', () => {
    const onlyOneCares = score(
      withAnswers(build('Ana', mid), { noise_level: 0, noise_bother: 1 }),
      withAnswers(build('Ben', mid), { noise_bother: 0 }),
    );
    assert.equal(axis(onlyOneCares, 'noise').importance, 'high');
  });

  it('scores the thermostat on the real temperature gap', () => {
    const same = score(
      withAnswers(build('Ana', mid), { temp_pref: 70 }),
      withAnswers(build('Ben', mid), { temp_pref: 70 }),
    );
    assert.equal(axis(same, 'temperature').score, 100);

    const wide = score(
      withAnswers(build('Ana', mid), { temp_pref: 62 }),
      withAnswers(build('Ben', mid), { temp_pref: 78 }),
    );
    // 16°F apart is past the 10°F "total disagreement" ceiling, so that question
    // contributes zero; the axis still has one other question at 100.
    assert.equal(axis(wide, 'temperature').score, 50);
    assert.match(axis(wide, 'temperature').insight, /62°F/);
    assert.match(axis(wide, 'temperature').insight, /16°/);
  });

  it('picks the weakest axis by weighted shortfall, not raw score', () => {
    // Chores: total disagreement, but neither person cares.
    // Noise: a moderate gap on something both care about intensely.
    const a = withAnswers(build('Ana', mid), {
      chores_system: 0,
      chores_food: 0,
      chores_bother: 0,
      noise_level: 0.25,
      noise_quiet: 0.25,
      noise_bother: 1,
    });
    const b = withAnswers(build('Ben', mid), {
      chores_system: 1,
      chores_food: 1,
      chores_bother: 0,
      noise_level: 0.75,
      noise_quiet: 0.75,
      noise_bother: 1,
    });

    const result = score(a, b);
    assert.equal(axis(result, 'chores').score, 0);
    assert.ok(axis(result, 'noise').score > 0);
    assert.equal(result.weakest.axis, 'noise');
  });

  it('names the strongest axis by raw agreement', () => {
    const result = score(
      withAnswers(build('Ana', mid), { sleep_bed: 0, sleep_wake: 0 }),
      build('Ben', mid),
    );
    assert.notEqual(result.strongest.axis, 'sleep');
    assert.equal(result.strongest.score, 100);
  });
});

describe('deal-breakers', () => {
  it('caps an otherwise great match when a hard limit is crossed', () => {
    const smoker = withAnswers(build('Ana', mid), { life_smoke: 1, life_smoke_tol: 0 });
    const objector = withAnswers(build('Ben', mid), { life_smoke: 0, life_smoke_tol: 1 });

    const result = score(smoker, objector);

    assert.equal(result.dealBreakers.length, 1);
    assert.match(result.dealBreakers[0].message, /Ana smokes or vapes indoors/);
    assert.match(result.dealBreakers[0].message, /Ben listed that as a dealbreaker/);
    assert.equal(result.cappedByDealBreaker, true);
    assert.equal(result.overall, DEAL_BREAKER_CAP);
  });

  it('detects a crossed limit in either direction', () => {
    const petOwner = withAnswers(build('Ana', mid), { life_pets: 1, life_pets_tol: 0 });
    const allergic = withAnswers(build('Ben', mid), { life_pets: 0, life_pets_tol: 1 });

    const forwards = score(petOwner, allergic);
    const backwards = score(allergic, petOwner);

    assert.equal(forwards.dealBreakers.length, 1);
    assert.equal(backwards.dealBreakers.length, 1);
    assert.match(forwards.dealBreakers[0].message, /Ana has a pet/);
    assert.match(backwards.dealBreakers[0].message, /Ana has a pet/);
  });

  it('does not fire when the other person is merely unenthusiastic', () => {
    const petOwner = withAnswers(build('Ana', mid), { life_pets: 1 });
    const reluctant = withAnswers(build('Ben', mid), { life_pets_tol: 0.7 }); // "rather not"

    assert.equal(score(petOwner, reluctant).dealBreakers.length, 0);
  });

  it('never raises a score that is already below the cap', () => {
    // Opposite on everything, and Ben smokes indoors against Ana's hard no.
    // Tolerance answers carry no agreement weight, so the raw score stays at rock bottom.
    const ana = withAnswers(build('Ana', low), { life_smoke_tol: 1 });
    const ben = build('Ben', high); // life_smoke === 1

    const result = score(ana, ben);

    assert.ok(result.dealBreakers.length > 0, 'expected the smoking limit to be crossed');
    assert.equal(result.cappedByDealBreaker, false);
    assert.ok(
      result.overall < DEAL_BREAKER_CAP,
      `cap must not lift a ${result.overall} to ${DEAL_BREAKER_CAP}`,
    );
  });
});

describe('robustness', () => {
  it('survives a partially answered profile', () => {
    const full = build('Ana', mid);
    const partial: Profile = { name: 'Ben', answers: { sleep_bed: 0.5, noise_level: 0.5 } };

    const result = score(full, partial);
    assert.ok(Number.isFinite(result.overall));
    assert.ok(result.overall >= 0 && result.overall <= 100);
  });

  it('is symmetric in its overall score', () => {
    const a = withAnswers(build('Ana', mid), { sleep_bed: 0.25, clean_dishes: 1 });
    const b = withAnswers(build('Ben', mid), { sleep_bed: 1, clean_dishes: 0.25 });

    assert.equal(score(a, b).overall, score(b, a).overall);
  });
});
