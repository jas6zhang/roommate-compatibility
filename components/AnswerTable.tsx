'use client';

import { AxisResult } from '@/lib/scoring';

/**
 * The table-view twin. Every value shown in a chart is also reachable here as
 * text, so nothing on this page is gated behind hover or colour.
 */
export function AnswerTable({
  axes,
  names,
}: {
  axes: AxisResult[];
  names: [string, string];
}) {
  return (
    <div className="table-wrap">
      <table className="answers">
        <caption className="sr-only">
          Every question, both answers, and the resulting agreement
        </caption>
        <thead>
          <tr>
            <th scope="col">Question</th>
            <th scope="col">
              <span className="legend__swatch legend__swatch--1" aria-hidden="true" />
              {names[0]}
            </th>
            <th scope="col">
              <span className="legend__swatch legend__swatch--2" aria-hidden="true" />
              {names[1]}
            </th>
            <th scope="col" className="answers__num">
              Agreement
            </th>
          </tr>
        </thead>
        {axes.map((axis) => (
          <tbody key={axis.axis}>
            <tr className="answers__section">
              <th scope="colgroup" colSpan={3}>
                {axis.label}
              </th>
              <td className="answers__num">{axis.score}%</td>
            </tr>
            {axis.questions.map((q) => (
              <tr key={q.id}>
                <th scope="row" className="answers__q">
                  {q.prompt}
                </th>
                <td>{q.a}</td>
                <td>{q.b}</td>
                <td className="answers__num">
                  {q.agreement === undefined ? (
                    <span className="answers__na" title="A hard limit, not a preference — not scored as agreement">
                      not scored
                    </span>
                  ) : (
                    `${q.agreement}%`
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}
