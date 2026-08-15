import { Result } from '@/lib/scoring';

import { StatusIcon, TONE_COLOR } from './StatusIcon';

/**
 * The headline is one number, so the form is a hero figure — not a gauge, ring or
 * two-slice donut. The meter beneath restates it positionally: the fill carries
 * severity, the track is that same hue washed back.
 *
 * The band label stays in primary ink. Two of the four status hues sit below 3:1
 * on the light surface, so the colour rides the icon and the meter fill while the
 * words carry the meaning.
 */
export function HeroScore({ result, names }: { result: Result; names: [string, string] }) {
  const color = TONE_COLOR[result.band.tone];

  return (
    <section className="hero" aria-labelledby="hero-heading">
      <p className="hero__eyebrow">
        {names[0]} &amp; {names[1]}
      </p>

      <div className="hero__figure">
        <span className="hero__number">{result.overall}</span>
        <span className="hero__unit">/ 100</span>
      </div>

      <h1 id="hero-heading" className="hero__band">
        <StatusIcon tone={result.band.tone} size={22} />
        <span>{result.band.label}</span>
      </h1>

      <div
        className="meter"
        role="img"
        aria-label={`Compatibility ${result.overall} out of 100 — ${result.band.label}`}
      >
        <div
          className="meter__fill"
          style={{ width: `${result.overall}%`, background: color }}
        />
      </div>

      <p className="hero__summary">{result.band.summary}</p>

      {result.cappedByDealBreaker && (
        <p className="hero__capped">
          Held at {result.overall} because of the dealbreaker below — the rest of your
          answers scored higher.
        </p>
      )}
    </section>
  );
}
