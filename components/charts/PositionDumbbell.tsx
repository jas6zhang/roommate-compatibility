'use client';

import { AXES } from '@/lib/questions';
import { AxisResult } from '@/lib/scoring';

/**
 * Two entities, so two categorical hues — the validated blue/orange pair, which
 * clears CVD separation, the normal-vision floor and 3:1 contrast in both modes.
 *
 * A legend is always present because there are two series; the dots additionally
 * carry a 2px surface ring so they stay readable where they overlap. The
 * connector is neutral ink, not a series colour — it is the gap, not a person.
 */
export function PositionDumbbell({
  axes,
  names,
}: {
  axes: AxisResult[];
  names: [string, string];
}) {
  const widest = axes.reduce((worst, ax) =>
    Math.abs(ax.aPosition - ax.bPosition) > Math.abs(worst.aPosition - worst.bPosition)
      ? ax
      : worst,
  );

  return (
    <div className="dumbbell">
      <div className="legend">
        {names.map((name, i) => (
          <span key={i} className="legend__item">
            <span className={`legend__swatch legend__swatch--${i + 1}`} aria-hidden="true" />
            {name}
          </span>
        ))}
      </div>

      <ul className="dumbbell__list" role="list">
        {axes.map((axis) => {
          const meta = AXES.find((m) => m.id === axis.axis)!;
          const a = axis.aPosition * 100;
          const b = axis.bPosition * 100;
          const left = Math.min(a, b);
          const width = Math.abs(a - b);

          return (
            <li key={axis.axis} className="dumbbell__row" tabIndex={0}>
              <div className="dumbbell__head">
                <span className="dumbbell__label">{meta.label}</span>
                {axis.axis === widest.axis && width > 6 && (
                  <span className="chip chip--flag">Widest gap</span>
                )}
              </div>

              <div className="dumbbell__plot">
                <div className="dumbbell__axis" />
                <div
                  className="dumbbell__connector"
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
                <span
                  className="dumbbell__dot dumbbell__dot--1"
                  style={{ left: `${a}%` }}
                  aria-hidden="true"
                />
                <span
                  className="dumbbell__dot dumbbell__dot--2"
                  style={{ left: `${b}%` }}
                  aria-hidden="true"
                />
              </div>

              <div className="dumbbell__poles">
                <span>{meta.lowLabel}</span>
                <span>{meta.highLabel}</span>
              </div>

              <div className="tooltip" role="tooltip">
                <strong>{meta.label}</strong>
                <span>{axis.insight}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
