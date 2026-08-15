'use client';

import { useMemo, useRef, useState } from 'react';

import { MAX_NAME_LENGTH } from '@/lib/codec';
import {
  AXES,
  ChoiceQuestion,
  NumberQuestion,
  Question,
  questionsForAxis,
} from '@/lib/questions';

export interface DraftProfile {
  name: string;
  answers: Record<string, number>;
}

const KIND_NOTE: Partial<Record<Question['kind'], string>> = {
  weight: 'How much this matters to you',
  tolerance: 'A hard limit, not a preference',
};

function ChoiceField({
  question,
  value,
  onChange,
  missing,
}: {
  question: ChoiceQuestion;
  value: number | undefined;
  onChange: (v: number) => void;
  missing: boolean;
}) {
  return (
    <fieldset className={`field${missing ? ' field--missing' : ''}`}>
      <legend className="field__legend">
        {question.prompt}
        {KIND_NOTE[question.kind] && (
          <span className="field__note">{KIND_NOTE[question.kind]}</span>
        )}
      </legend>
      <div className="options">
        {question.choices.map((choice) => {
          const id = `${question.id}-${choice.value}`;
          const checked = value !== undefined && Math.abs(value - choice.value) < 1e-6;
          return (
            <label key={id} className={`option${checked ? ' option--on' : ''}`} htmlFor={id}>
              <input
                id={id}
                type="radio"
                name={question.id}
                checked={checked}
                onChange={() => onChange(choice.value)}
              />
              <span className="option__dot" aria-hidden="true" />
              <span className="option__text">{choice.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function NumberField({
  question,
  value,
  onChange,
}: {
  question: NumberQuestion;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <fieldset className="field">
      <legend className="field__legend">{question.prompt}</legend>
      <div className="slider">
        <output className="slider__value" htmlFor={question.id}>
          {Math.round(value)}
          <span className="slider__unit">{question.unit}</span>
        </output>
        <input
          id={question.id}
          type="range"
          min={question.min}
          max={question.max}
          step={question.step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-valuetext={`${Math.round(value)} ${question.unit}`}
        />
        <div className="slider__ends">
          <span>{question.min}{question.unit}</span>
          <span>{question.max}{question.unit}</span>
        </div>
      </div>
    </fieldset>
  );
}

export function Quiz({
  initial,
  invitedBy,
  onComplete,
  onCancel,
}: {
  initial?: DraftProfile;
  invitedBy?: string;
  onComplete: (profile: DraftProfile) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [answers, setAnswers] = useState<Record<string, number>>(
    // The thermostat starts at a sensible room temperature rather than empty.
    () => ({ temp_pref: 70, ...(initial?.answers ?? {}) }),
  );
  const [step, setStep] = useState(0);
  const [showMissing, setShowMissing] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const steps = useMemo(() => ['name' as const, ...AXES.map((a) => a.id)], []);
  const total = steps.length;
  const current = steps[step];

  const stepQuestions = current === 'name' ? [] : questionsForAxis(current);
  const missingIds = stepQuestions
    .filter((q) => answers[q.id] === undefined)
    .map((q) => q.id);

  const canAdvance = current === 'name' ? name.trim().length > 0 : missingIds.length === 0;

  const set = (id: string, v: number) =>
    setAnswers((prev) => ({ ...prev, [id]: v }));

  const go = (next: number) => {
    setShowMissing(false);
    setStep(next);
    topRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  const next = () => {
    if (!canAdvance) {
      setShowMissing(true);
      return;
    }
    if (step === total - 1) {
      onComplete({ name: name.trim(), answers });
      return;
    }
    go(step + 1);
  };

  const axisMeta = current === 'name' ? null : AXES.find((a) => a.id === current)!;
  const progress = Math.round((step / total) * 100);

  return (
    <div className="quiz" ref={topRef}>
      <div className="quiz__progress" role="group" aria-label="Quiz progress">
        <div className="quiz__progress-track">
          <div className="quiz__progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="quiz__progress-text">
          Step {step + 1} of {total}
          {axisMeta && ` · ${axisMeta.label}`}
        </p>
      </div>

      {current === 'name' ? (
        <div className="quiz__step">
          <h2 className="quiz__heading">
            {invitedBy ? `${invitedBy} wants to know how you'd live together` : 'First, your name'}
          </h2>
          <p className="quiz__blurb">
            {invitedBy
              ? `Answer the same 26 questions ${invitedBy} did and you'll both see where you actually differ. Your answers stay in your browser.`
              : 'It only shows up in your own results and on the link you choose to send.'}
          </p>
          <fieldset className="field">
            <legend className="field__legend">What should we call you?</legend>
            <input
              className="text-input"
              type="text"
              value={name}
              maxLength={MAX_NAME_LENGTH}
              placeholder="Alex"
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && next()}
            />
          </fieldset>
        </div>
      ) : (
        <div className="quiz__step">
          <h2 className="quiz__heading">{axisMeta!.label}</h2>
          <p className="quiz__blurb">{axisMeta!.blurb}</p>

          {stepQuestions.map((q) =>
            q.kind === 'number' ? (
              <NumberField
                key={q.id}
                question={q}
                value={answers[q.id] ?? 70}
                onChange={(v) => set(q.id, v)}
              />
            ) : (
              <ChoiceField
                key={q.id}
                question={q}
                value={answers[q.id]}
                onChange={(v) => set(q.id, v)}
                missing={showMissing && missingIds.includes(q.id)}
              />
            ),
          )}
        </div>
      )}

      {showMissing && !canAdvance && (
        <p className="quiz__error" role="alert">
          {current === 'name'
            ? 'Add a name so your results are readable.'
            : `${missingIds.length} question${missingIds.length === 1 ? '' : 's'} still to answer.`}
        </p>
      )}

      <div className="quiz__nav">
        {step > 0 ? (
          <button type="button" className="btn btn--ghost" onClick={() => go(step - 1)}>
            Back
          </button>
        ) : onCancel ? (
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            Cancel
          </button>
        ) : (
          <span />
        )}

        <button
          type="button"
          className="btn btn--primary"
          onClick={next}
          aria-disabled={!canAdvance}
        >
          {step === total - 1 ? 'See the result' : 'Next'}
        </button>
      </div>
    </div>
  );
}
