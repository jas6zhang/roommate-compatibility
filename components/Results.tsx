'use client';

import { useState } from 'react';

import { Profile, Result } from '@/lib/scoring';

import { AnswerTable } from './AnswerTable';
import { AgreementBars } from './charts/AgreementBars';
import { HeroScore } from './charts/HeroScore';
import { PositionDumbbell } from './charts/PositionDumbbell';
import { StatusIcon } from './charts/StatusIcon';

export function Results({
  result,
  a,
  b,
  children,
}: {
  result: Result;
  a: Profile;
  b: Profile;
  children?: React.ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);
  const names: [string, string] = [a.name, b.name];

  return (
    <div className="results">
      <HeroScore result={result} names={names} />

      {result.dealBreakers.length > 0 && (
        <section className="alert" role="note">
          <div className="alert__head">
            <StatusIcon tone="critical" size={20} />
            <h2 className="alert__title">
              {result.dealBreakers.length === 1 ? 'One dealbreaker' : 'Dealbreakers'}
            </h2>
          </div>
          <ul className="alert__list">
            {result.dealBreakers.map((d) => (
              <li key={d.id}>{d.message}</li>
            ))}
          </ul>
          <p className="alert__foot">
            This is the kind of thing that ends a lease rather than a conversation. Settle
            it before anyone signs anything.
          </p>
        </section>
      )}

      <div className="highlights">
        <div className="highlight">
          <p className="highlight__label">Talk about this first</p>
          <p className="highlight__value">{result.weakest.label}</p>
          <p className="highlight__note">{result.weakest.insight}</p>
        </div>
        <div className="highlight">
          <p className="highlight__label">Where you already agree</p>
          <p className="highlight__value">{result.strongest.label}</p>
          <p className="highlight__note">{result.strongest.insight}</p>
        </div>
      </div>

      <section className="panel">
        <div className="panel__head">
          <div>
            <h2 className="panel__title">Agreement by category</h2>
            <p className="panel__sub">
              Hardest first, weighted by how much the two of you said each one matters.
            </p>
          </div>
        </div>
        <AgreementBars axes={result.axes} />
      </section>

      <section className="panel">
        <div className="panel__head">
          <div>
            <h2 className="panel__title">Where each of you sits</h2>
            <p className="panel__sub">
              The distance between the two dots is the gap you would be living with.
            </p>
          </div>
        </div>
        <PositionDumbbell axes={result.axes} names={names} />
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">Every answer</h2>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setShowTable((v) => !v)}
            aria-expanded={showTable}
          >
            {showTable ? 'Hide table' : 'Show table'}
          </button>
        </div>
        {showTable && <AnswerTable axes={result.axes} names={names} />}
      </section>

      {children}
    </div>
  );
}
