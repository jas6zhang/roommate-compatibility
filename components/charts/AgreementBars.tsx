'use client';

import { AxisResult } from '@/lib/scoring';

const IMPORTANCE_LABEL: Record<AxisResult['importance'], string> = {
  high: 'Matters a lot',
  medium: 'Matters somewhat',
  low: 'Low stakes',
};

/**
 * One series (agreement), so one hue for every bar — bar length is the encoding
 * and colouring darker-where-bigger would just double-encode it.
 *
 * The value sits in its own column at the tip rather than inside the fill, so a
 * short bar can never clip its own label.
 */
export function AgreementBars({ axes }: { axes: AxisResult[] }) {
  // Worst first: the top of this list is what the two of you should actually talk about.
  const ordered = [...axes].sort(
    (a, b) => (a.score - 100) * a.weight - (b.score - 100) * b.weight,
  );

  return (
    <ul className="bars" role="list">
      {ordered.map((axis) => (
        <li key={axis.axis} className="bars__row" tabIndex={0}>
          <div className="bars__head">
            <span className="bars__label">{axis.label}</span>
            <span
              className={`chip chip--${axis.importance}`}
              title="How much the two of you said this matters"
            >
              {IMPORTANCE_LABEL[axis.importance]}
            </span>
          </div>

          <div className="bars__plot">
            <div className="bars__track">
              <div className="bars__fill" style={{ width: `${axis.score}%` }} />
            </div>
            <span className="bars__value">{axis.score}%</span>
          </div>

          <p className="bars__insight">{axis.insight}</p>

          <div className="tooltip" role="tooltip">
            <strong>{axis.label}</strong>
            <span>
              {axis.score}% agreement · {IMPORTANCE_LABEL[axis.importance].toLowerCase()}
            </span>
            <span>{axis.insight}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
