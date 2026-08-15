/**
 * The question bank.
 *
 * Every answer is stored as a number in [0, 1] (temperature is the one exception —
 * it is stored in °F and normalised at scoring time). Keeping a single normalised
 * representation is what lets the scoring engine stay small and the URL payload
 * stay short.
 *
 * Question kinds:
 *   preference — a position on a spectrum. Drives the agreement score.
 *   weight     — how much this axis matters to you. Drives the axis weighting.
 *   tolerance  — a hard limit. Never scored as agreement; feeds deal-breakers only.
 */

export type AxisId =
  | 'sleep'
  | 'cleanliness'
  | 'guests'
  | 'temperature'
  | 'noise'
  | 'chores'
  | 'lifestyle'
  | 'money';

export interface AxisMeta {
  id: AxisId;
  label: string;
  /** Shown under the section heading while answering. */
  blurb: string;
  /** How to describe someone whose answers sit near 0 / near 1. */
  lowLabel: string;
  highLabel: string;
}

export const AXES: AxisMeta[] = [
  {
    id: 'sleep',
    label: 'Sleep schedule',
    blurb: 'When the lights go out, and how easily they wake you.',
    lowLabel: 'an earlier schedule',
    highLabel: 'a later schedule',
  },
  {
    id: 'cleanliness',
    label: 'Cleanliness',
    blurb: 'The standard you keep in shared space.',
    lowLabel: 'a tidier standard',
    highLabel: 'a more relaxed standard',
  },
  {
    id: 'guests',
    label: 'Guests',
    blurb: 'How much other people are in the apartment.',
    lowLabel: 'a quieter guest list',
    highLabel: 'more people over',
  },
  {
    id: 'temperature',
    label: 'Temperature',
    blurb: 'The thermostat argument, settled in advance.',
    lowLabel: 'a cooler home',
    highLabel: 'a warmer home',
  },
  {
    id: 'noise',
    label: 'Noise',
    blurb: 'Ambient volume and when it needs to stop.',
    lowLabel: 'a quieter home',
    highLabel: 'a louder home',
  },
  {
    id: 'chores',
    label: 'Chores & sharing',
    blurb: 'Who does what, and what is communal.',
    lowLabel: 'more structure',
    highLabel: 'more improvisation',
  },
  {
    id: 'lifestyle',
    label: 'Lifestyle',
    blurb: 'Smoking, pets, and how much you are actually home.',
    lowLabel: 'a quieter, emptier apartment',
    highLabel: 'a fuller, more lived-in one',
  },
  {
    id: 'money',
    label: 'Money & conflict',
    blurb: 'Paying on time, and raising things that bother you.',
    lowLabel: 'paying early and speaking up',
    highLabel: 'a looser, less direct approach',
  },
];

export interface Choice {
  label: string;
  /** Normalised position on this question's spectrum. */
  value: number;
}

interface QuestionBase {
  id: string;
  axis: AxisId;
  prompt: string;
}

export interface ChoiceQuestion extends QuestionBase {
  kind: 'preference' | 'weight' | 'tolerance';
  choices: Choice[];
}

export interface NumberQuestion extends QuestionBase {
  kind: 'number';
  min: number;
  max: number;
  step: number;
  unit: string;
  /** Difference, in raw units, treated as complete disagreement. */
  maxGap: number;
}

export type Question = ChoiceQuestion | NumberQuestion;

/** Five evenly-spaced options, first = 0, last = 1. */
const spread = (labels: string[]): Choice[] =>
  labels.map((label, i) => ({ label, value: i / (labels.length - 1) }));

const HOW_MUCH = spread([
  'Not at all',
  'A little',
  'Somewhat',
  'A lot',
  'It would end the friendship',
]);

export const QUESTIONS: Question[] = [
  // ── Sleep ────────────────────────────────────────────────────────────────
  {
    id: 'sleep_bed',
    axis: 'sleep',
    kind: 'preference',
    prompt: 'On a weeknight, when are you usually in bed?',
    choices: spread([
      'Before 9:30pm',
      '9:30 – 11pm',
      '11pm – 12:30am',
      '12:30 – 2am',
      'After 2am',
    ]),
  },
  {
    id: 'sleep_wake',
    axis: 'sleep',
    kind: 'preference',
    prompt: 'And when are you usually up?',
    choices: spread([
      'Before 6am',
      '6 – 7:30am',
      '7:30 – 9am',
      '9 – 11am',
      'After 11am',
    ]),
  },
  {
    id: 'sleep_light',
    axis: 'sleep',
    kind: 'weight',
    prompt: 'How easily does noise or light wake you up?',
    choices: spread([
      'I sleep through anything',
      'Rarely wakes me',
      'Sometimes wakes me',
      'Easily woken',
      'Any sound wakes me',
    ]),
  },

  // ── Cleanliness ──────────────────────────────────────────────────────────
  {
    id: 'clean_dishes',
    axis: 'cleanliness',
    kind: 'preference',
    prompt: 'A dirty dish goes in the sink. When does it get washed?',
    choices: spread([
      'Immediately',
      'Same day',
      'Within a day or two',
      'When the sink fills up',
      'Eventually',
    ]),
  },
  {
    id: 'clean_common',
    axis: 'cleanliness',
    kind: 'preference',
    prompt: 'What state should the living room be in on a normal Wednesday?',
    choices: spread([
      'Spotless',
      'Tidy',
      'Lived-in',
      'A bit cluttered',
      'Whatever it is',
    ]),
  },
  {
    id: 'clean_bother',
    axis: 'cleanliness',
    kind: 'weight',
    prompt: "How much does someone else's mess in shared space bother you?",
    choices: HOW_MUCH,
  },

  // ── Guests ───────────────────────────────────────────────────────────────
  {
    id: 'guests_freq',
    axis: 'guests',
    kind: 'preference',
    prompt: 'How often do you have people over?',
    choices: spread([
      'Almost never',
      'About once a month',
      'Most weeks',
      'Several times a week',
      'Most days',
    ]),
  },
  {
    id: 'guests_over',
    axis: 'guests',
    kind: 'preference',
    prompt: 'How often would a partner or friend stay the night?',
    choices: spread([
      'Never',
      'Occasionally',
      'A few nights a month',
      'Several nights a week',
      'They would basically live here',
    ]),
  },
  {
    id: 'guests_bother',
    axis: 'guests',
    kind: 'weight',
    prompt: "How much do you mind a roommate's guests being around?",
    choices: HOW_MUCH,
  },

  // ── Temperature ──────────────────────────────────────────────────────────
  {
    id: 'temp_pref',
    axis: 'temperature',
    kind: 'number',
    prompt: 'Where would you set the thermostat, left to your own devices?',
    min: 60,
    max: 80,
    step: 1,
    unit: '°F',
    maxGap: 10,
  },
  {
    id: 'temp_window',
    axis: 'temperature',
    kind: 'preference',
    prompt: 'Windows open when it is cold out?',
    // Ordered cool → warm so the axis position agrees with `temp_pref`.
    choices: spread([
      'I sleep with them open',
      'Often',
      'Sometimes',
      'Rarely',
      'Never',
    ]),
  },
  {
    id: 'temp_bother',
    axis: 'temperature',
    kind: 'weight',
    prompt: 'How much does being too hot or too cold at home bother you?',
    choices: HOW_MUCH,
  },

  // ── Noise ────────────────────────────────────────────────────────────────
  {
    id: 'noise_level',
    axis: 'noise',
    kind: 'preference',
    prompt: 'What is the volume of your normal evening at home?',
    choices: spread([
      'Near silent',
      'Quiet — headphones mostly',
      'Moderate — TV or music on',
      'Loud — speakers, calls, friends',
      'It is usually a party',
    ]),
  },
  {
    id: 'noise_quiet',
    axis: 'noise',
    kind: 'preference',
    prompt: 'When should the apartment go quiet?',
    choices: spread([
      'By 9pm, strictly',
      'Around 10pm',
      'Around midnight',
      'Late — 2am or so',
      'No fixed quiet hours',
    ]),
  },
  {
    id: 'noise_bother',
    axis: 'noise',
    kind: 'weight',
    prompt: 'How much does a roommate making noise bother you?',
    choices: HOW_MUCH,
  },

  // ── Chores & sharing ─────────────────────────────────────────────────────
  {
    id: 'chores_system',
    axis: 'chores',
    kind: 'preference',
    prompt: 'How should chores get divided?',
    choices: spread([
      'A written rota',
      'A clear spoken agreement',
      'Roughly taking turns',
      'Whoever notices does it',
      'No system at all',
    ]),
  },
  {
    id: 'chores_food',
    axis: 'chores',
    kind: 'preference',
    prompt: 'Groceries and food?',
    choices: spread([
      'Strictly separate — label everything',
      'Mostly separate',
      'Share staples, buy your own extras',
      'Mostly shared',
      'One pot, split the bill',
    ]),
  },
  {
    id: 'chores_bother',
    axis: 'chores',
    kind: 'weight',
    prompt: 'How much does an uneven split of the work bother you?',
    choices: HOW_MUCH,
  },

  // ── Lifestyle ────────────────────────────────────────────────────────────
  {
    id: 'life_smoke',
    axis: 'lifestyle',
    kind: 'preference',
    prompt: 'Do you smoke or vape?',
    choices: [
      { label: 'No, never', value: 0 },
      { label: 'Outdoors only', value: 0.4 },
      { label: 'Occasionally indoors', value: 0.75 },
      { label: 'Regularly indoors', value: 1 },
    ],
  },
  {
    id: 'life_smoke_tol',
    axis: 'lifestyle',
    kind: 'tolerance',
    prompt: 'How do you feel about a roommate smoking or vaping indoors?',
    choices: [
      { label: 'Completely fine', value: 0 },
      { label: "I'd rather they didn't", value: 0.5 },
      { label: 'Hard no — a dealbreaker', value: 1 },
    ],
  },
  {
    id: 'life_pets',
    axis: 'lifestyle',
    kind: 'preference',
    prompt: 'Pets?',
    choices: [
      { label: 'None, and I do not want any', value: 0 },
      { label: 'None, but I am open to it', value: 0.35 },
      { label: 'I have one', value: 0.75 },
      { label: 'I have more than one', value: 1 },
    ],
  },
  {
    id: 'life_pets_tol',
    axis: 'lifestyle',
    kind: 'tolerance',
    prompt: "Living with a roommate's cat or dog?",
    choices: [
      { label: 'Would love it', value: 0 },
      { label: 'Fine with it', value: 0.35 },
      { label: 'Would rather not', value: 0.7 },
      { label: 'Allergic, or a hard no', value: 1 },
    ],
  },
  {
    id: 'life_home',
    axis: 'lifestyle',
    kind: 'preference',
    prompt: 'How much are you actually home?',
    choices: spread([
      'Barely — I am out constantly',
      'Evenings only',
      'Evenings and weekends',
      'I work from home some days',
      'I am home almost all the time',
    ]),
  },

  // ── Money & conflict ─────────────────────────────────────────────────────
  {
    id: 'money_bills',
    axis: 'money',
    kind: 'preference',
    prompt: 'Rent and bills are due. Realistically, when do you pay?',
    choices: spread([
      'Early, every time',
      'On the day',
      'Within a few days',
      'Usually needs a reminder',
      'Takes a few reminders',
    ]),
  },
  {
    id: 'money_style',
    axis: 'money',
    kind: 'preference',
    prompt: 'Something a roommate does is annoying you. What happens?',
    choices: spread([
      'I say so right away',
      'I bring it up within a day or two',
      'I wait for a natural moment',
      'I let a lot slide first',
      'I say nothing until I snap',
    ]),
  },
  {
    id: 'money_bother',
    axis: 'money',
    kind: 'weight',
    prompt: 'How much does a roommate being late with money bother you?',
    choices: HOW_MUCH,
  },
];

export const QUESTIONS_BY_ID: Record<string, Question> = Object.fromEntries(
  QUESTIONS.map((q) => [q.id, q]),
);

/** Stable order used by the URL codec. Never reorder without bumping the codec version. */
export const QUESTION_ORDER: string[] = QUESTIONS.map((q) => q.id);

export const questionsForAxis = (axis: AxisId): Question[] =>
  QUESTIONS.filter((q) => q.axis === axis);

/**
 * Deal-breakers are directional: one person's behaviour against the other's hard limit.
 * `subject` is the behaviour question, `limit` is the tolerance question on the other side.
 */
export interface DealBreakerRule {
  id: string;
  subject: string;
  subjectAtLeast: number;
  limit: string;
  limitAtLeast: number;
  /** `{a}` is the person doing the thing, `{b}` is the person whose limit it crosses. */
  message: string;
}

export const DEAL_BREAKERS: DealBreakerRule[] = [
  {
    id: 'smoking',
    subject: 'life_smoke',
    subjectAtLeast: 0.75,
    limit: 'life_smoke_tol',
    limitAtLeast: 1,
    message: '{a} smokes or vapes indoors, and {b} listed that as a dealbreaker.',
  },
  {
    id: 'pets',
    subject: 'life_pets',
    subjectAtLeast: 0.75,
    limit: 'life_pets_tol',
    limitAtLeast: 1,
    message: '{a} has a pet, and {b} is allergic or ruled it out.',
  },
];
