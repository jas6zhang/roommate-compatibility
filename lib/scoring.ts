/**
 * The compatibility engine. Pure functions, no DOM, no I/O — so it can be unit
 * tested directly and reused anywhere.
 *
 * The model, in one paragraph: every preference question puts both people on a
 * 0–1 spectrum. Agreement on a question falls off with the distance between them,
 * on a slightly convex curve so a one-notch difference is cheap and an
 * opposite-ends difference is not. An axis score is the mean agreement across its
 * preference questions. Axes are then weighted by how much the pair *cares* —
 * taking the higher of the two sensitivities, because friction is set by whoever
 * minds more, not by the average. Finally, hard limits (indoor smoking, pet
 * allergies) are checked directionally and cap the headline score if crossed.
 */

import {
  AXES,
  AxisId,
  AxisMeta,
  DEAL_BREAKERS,
  NumberQuestion,
  Question,
  QUESTIONS,
  QUESTIONS_BY_ID,
} from './questions';

export interface Profile {
  name: string;
  answers: Record<string, number>;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Distance → agreement. The exponent makes small gaps forgiving (a single notch
 * apart on a 5-point scale still reads as ~85% agreement) while keeping
 * opposite ends at zero.
 */
const AGREEMENT_EXPONENT = 1.35;
const agreementFrom = (distance: number) =>
  1 - Math.pow(clamp01(distance), AGREEMENT_EXPONENT);

/** An axis nobody cares about still counts a little; one both care about counts quadruple. */
const WEIGHT_FLOOR = 0.5;
const WEIGHT_RANGE = 1.5;

/** A crossed hard limit cannot leave the headline number in "good match" territory. */
export const DEAL_BREAKER_CAP = 45;

const isNumberQuestion = (q: Question): q is NumberQuestion => q.kind === 'number';

/** Every question mapped onto 0–1, whatever its native units. */
const normalised = (q: Question, raw: number): number =>
  isNumberQuestion(q) ? clamp01((raw - q.min) / (q.max - q.min)) : clamp01(raw);

/** Distance between two answers to the same question, on a 0–1 scale. */
const distance = (q: Question, a: number, b: number): number =>
  isNumberQuestion(q)
    ? clamp01(Math.abs(a - b) / q.maxGap)
    : clamp01(Math.abs(a - b));

export const answerLabel = (q: Question, raw: number | undefined): string => {
  if (raw === undefined || Number.isNaN(raw)) return '—';
  if (isNumberQuestion(q)) return `${Math.round(raw)}${q.unit}`;
  const match = q.choices.reduce((best, c) =>
    Math.abs(c.value - raw) < Math.abs(best.value - raw) ? c : best,
  );
  return match.label;
};

export interface QuestionComparison {
  id: string;
  prompt: string;
  kind: Question['kind'];
  a: string;
  b: string;
  /** 0–100. Undefined for tolerance questions, which are not scored as agreement. */
  agreement?: number;
}

export type Importance = 'low' | 'medium' | 'high';

export interface AxisResult {
  axis: AxisId;
  label: string;
  score: number;
  weight: number;
  importance: Importance;
  /** Mean preference position, 0–1, used for the "who leans which way" line. */
  aPosition: number;
  bPosition: number;
  insight: string;
  questions: QuestionComparison[];
}

export interface DealBreakerHit {
  id: string;
  message: string;
}

export type BandTone = 'good' | 'warning' | 'serious' | 'critical';

export interface Band {
  label: string;
  tone: BandTone;
  summary: string;
}

export interface Result {
  overall: number;
  band: Band;
  axes: AxisResult[];
  dealBreakers: DealBreakerHit[];
  cappedByDealBreaker: boolean;
  /** Highest- and lowest-scoring axes among those that carry real weight. */
  strongest: AxisResult;
  weakest: AxisResult;
}

const BANDS: { min: number; band: Band }[] = [
  {
    min: 85,
    band: {
      label: 'Excellent match',
      tone: 'good',
      summary: 'You want the same things from a home. Very little to negotiate.',
    },
  },
  {
    min: 70,
    band: {
      label: 'Strong match',
      tone: 'good',
      summary: 'Broadly aligned. Agree on the one or two gaps below and you are set.',
    },
  },
  {
    min: 55,
    band: {
      label: 'Workable with ground rules',
      tone: 'warning',
      summary: 'This can work well, but not by accident. Talk through the low scores first.',
    },
  },
  {
    min: 40,
    band: {
      label: 'Needs real negotiation',
      tone: 'serious',
      summary: 'Real differences in things you both care about. Worth a frank conversation.',
    },
  },
  {
    min: -Infinity,
    band: {
      label: 'Likely friction',
      tone: 'critical',
      summary: 'You want quite different things day to day. Go in with your eyes open.',
    },
  },
];

const bandFor = (score: number): Band =>
  BANDS.find(({ min }) => score >= min)!.band;

const importanceFor = (weightRaw: number): Importance =>
  weightRaw >= 0.67 ? 'high' : weightRaw >= 0.34 ? 'medium' : 'low';

/** Mean of a list, or a fallback when the list is empty. */
const mean = (xs: number[], fallback = 0.5) =>
  xs.length === 0 ? fallback : xs.reduce((s, x) => s + x, 0) / xs.length;

function insightFor(
  axis: AxisMeta,
  a: Profile,
  b: Profile,
  aPos: number,
  bPos: number,
  score: number,
): string {
  // Temperature is the one axis where the raw numbers say it better than any adjective.
  if (axis.id === 'temperature') {
    const q = QUESTIONS_BY_ID['temp_pref'] as NumberQuestion;
    const av = a.answers[q.id];
    const bv = b.answers[q.id];
    if (av !== undefined && bv !== undefined) {
      const gap = Math.abs(Math.round(av) - Math.round(bv));
      if (gap === 0) return `You both want it at ${Math.round(av)}${q.unit}. No thermostat war.`;
      return `${a.name} wants ${Math.round(av)}${q.unit}, ${b.name} wants ${Math.round(bv)}${q.unit} — a ${gap}° gap.`;
    }
  }

  const diff = bPos - aPos;
  if (Math.abs(diff) < 0.12) {
    // Close on average is not the same as close on every question — an axis that
    // bundles unrelated habits can average out while the specifics diverge.
    return score >= 70
      ? 'You two line up closely here.'
      : 'On average you land in the same place, but you differ question by question — check the table.';
  }
  const [lower, higher] = diff > 0 ? [a, b] : [b, a];
  return `${lower.name} leans toward ${axis.lowLabel}; ${higher.name} toward ${axis.highLabel}.`;
}

function scoreAxis(axis: AxisMeta, a: Profile, b: Profile): AxisResult {
  const axisQuestions = QUESTIONS.filter((q) => q.axis === axis.id);

  const preference = axisQuestions.filter((q) => q.kind === 'preference' || q.kind === 'number');
  const weights = axisQuestions.filter((q) => q.kind === 'weight');

  const agreements: number[] = [];
  const comparisons: QuestionComparison[] = [];

  for (const q of axisQuestions) {
    const av = a.answers[q.id];
    const bv = b.answers[q.id];
    const scored = q.kind === 'preference' || q.kind === 'number';
    const bothAnswered = av !== undefined && bv !== undefined;

    let agreement: number | undefined;
    if (scored && bothAnswered) {
      agreement = agreementFrom(distance(q, av, bv));
      agreements.push(agreement);
    }

    comparisons.push({
      id: q.id,
      prompt: q.prompt,
      kind: q.kind,
      a: answerLabel(q, av),
      b: answerLabel(q, bv),
      agreement: agreement === undefined ? undefined : Math.round(agreement * 100),
    });
  }

  // How much the pair cares: the higher of the two sensitivities.
  const weightRaw = weights.length
    ? Math.max(
        ...weights.map((q) =>
          Math.max(clamp01(a.answers[q.id] ?? 0.5), clamp01(b.answers[q.id] ?? 0.5)),
        ),
      )
    : 0.5;

  const aPos = mean(preference.map((q) => normalised(q, a.answers[q.id] ?? 0.5)));
  const bPos = mean(preference.map((q) => normalised(q, b.answers[q.id] ?? 0.5)));
  const score = Math.round(mean(agreements, 0.5) * 100);

  return {
    axis: axis.id,
    label: axis.label,
    score,
    weight: WEIGHT_FLOOR + WEIGHT_RANGE * weightRaw,
    importance: importanceFor(weightRaw),
    aPosition: aPos,
    bPosition: bPos,
    insight: insightFor(axis, a, b, aPos, bPos, score),
    questions: comparisons,
  };
}

function findDealBreakers(a: Profile, b: Profile): DealBreakerHit[] {
  const hits: DealBreakerHit[] = [];
  for (const rule of DEAL_BREAKERS) {
    // Directional: check both ways round, each as its own finding.
    for (const [actor, other] of [
      [a, b],
      [b, a],
    ] as const) {
      const behaviour = actor.answers[rule.subject];
      const limit = other.answers[rule.limit];
      if (
        behaviour !== undefined &&
        limit !== undefined &&
        behaviour >= rule.subjectAtLeast &&
        limit >= rule.limitAtLeast
      ) {
        hits.push({
          id: `${rule.id}:${actor === a ? 'a' : 'b'}`,
          message: rule.message.replace('{a}', actor.name).replace('{b}', other.name),
        });
      }
    }
  }
  return hits;
}

export function score(a: Profile, b: Profile): Result {
  const axes = AXES.map((axis) => scoreAxis(axis, a, b));

  const totalWeight = axes.reduce((s, ax) => s + ax.weight, 0);
  const weighted = axes.reduce((s, ax) => s + ax.score * ax.weight, 0);
  const raw = Math.round(weighted / totalWeight);

  const dealBreakers = findDealBreakers(a, b);
  const cappedByDealBreaker = dealBreakers.length > 0 && raw > DEAL_BREAKER_CAP;
  const overall = cappedByDealBreaker ? DEAL_BREAKER_CAP : raw;

  const strongest = [...axes].sort((x, y) => y.score - x.score)[0];
  // Weakest = biggest *weighted* shortfall, so a mild gap on something you both
  // care about outranks a wide gap on something neither of you minds.
  const weakest = [...axes].sort(
    (x, y) => (x.score - 100) * x.weight - (y.score - 100) * y.weight,
  )[0];

  return {
    overall,
    band: bandFor(overall),
    axes,
    dealBreakers,
    cappedByDealBreaker,
    strongest,
    weakest,
  };
}
