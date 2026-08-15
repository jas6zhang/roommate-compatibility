# Roommate Compatibility

A 26-question compatibility check for people thinking about living together, covering
the things roommates actually fight about: sleep schedules, cleanliness, guests, the
thermostat, noise, chores, lifestyle, and money.

You answer the questions, get a link, and send it to someone. They answer the same
questions and both of you immediately see a scored breakdown of where you line up and
where you don't.

## No server, by design

There is no backend, no database, and no account. A profile is packed into the part of
the URL after the `#`, which browsers **never transmit to the server**. The site is a
fully static export, so even the host it is served from cannot see anyone's answers.

| Link shape | Meaning |
|---|---|
| `/` | Fresh start |
| `/#p=<profile>` | An invitation — answer the same questions and compare |
| `/#p=<a>&q=<b>` | A finished comparison, viewable by both people |

The tradeoff: **whoever holds the link holds the answers.** Send these to people, not to
public timelines.

## How the score works

Each preference question places both people on a 0–1 spectrum. Agreement falls off with
the distance between them on a slightly convex curve, so one notch apart still reads as
~85% while opposite ends read as 0.

An axis score is the mean agreement across its preference questions. Axes are then
weighted by how much the pair *cares*, taking the **higher** of the two sensitivities —
friction is set by whoever minds more, not by the average. A gap on something one person
feels strongly about outranks a wider gap on something neither of them notices.

Hard limits are handled separately. Indoor smoking against a stated hard no, or a pet
against an allergy, is checked directionally and **caps** the headline score at 45 rather
than being averaged away. The cap only ever lowers a score.

Answers are encoded as option *indices*, not quantised values, so a shared link is
lossless — both people always see the identical number.

## Development

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # scoring + codec unit tests
npm run typecheck
npm run lint
npm run build      # static export to ./out
```

`npm run build` writes plain HTML/CSS/JS to `out/`, deployable to any static host.

To regenerate the link-preview card after editing it:

```bash
node scripts/generate-og.mjs   # writes public/og.png
```

## Embedding it in another page

`/embed/` is the same quiz with the site chrome removed:

```html
<iframe
  src="https://YOUR-DOMAIN/embed/"
  title="Roommate compatibility quiz"
  width="100%"
  height="900"
  style="border:1px solid #e1e0d9;border-radius:14px"
  loading="lazy"
></iframe>
```

It inherits the visitor's light/dark preference and needs no configuration.

## Layout

```
app/
  layout.tsx          metadata, theme bootstrap
  page.tsx            the app
  embed/page.tsx      chrome-less copy for iframes
  globals.css         design tokens (light + dark)
  ui.css              component styles
lib/
  questions.ts        the question bank and dealbreaker rules
  scoring.ts          the compatibility engine (pure, unit tested)
  codec.ts            profile <-> URL fragment
  browser.ts          hash / storage / theme as external stores
components/
  charts/             hero figure, agreement bars, dumbbell
test/                 node:test suites
```

### A note on the charts

Colours come from a validated palette rather than taste. The two-person blue/orange pair
clears colour-vision-deficiency separation, the normal-vision floor, and 3:1 contrast in
both light and dark. Agreement bars use a single hue because bar length already encodes
the magnitude; status colour rides an icon and the meter fill, never the text, because
two of the four status hues fall below 3:1 on the light surface. Every chart has a table
view, so nothing is gated behind hover or colour.

## Licence

MIT.
