> Free edition: Field Notes only. The full pack (https://opensourcewarren.gumroad.com/l/quartz5-themes) adds Phosphor and Broadsheet, each with its own knobs.

# Customising the themes

Two places to edit, and a rule about where your own CSS goes.

## 1. Colours: `quartz.config.yaml`

Every colour in every theme comes from the nine Quartz colour roles under `configuration.theme.colors`. Change a value, rebuild, done. No SCSS involved.

| Role | What the theme uses it for |
| --- | --- |
| `light` | page background |
| `lightgray` | hairlines, borders, table rules |
| `gray` | muted text: dates, labels, breadcrumbs |
| `darkgray` | body text |
| `dark` | headings, the site name, strong rules |
| `secondary` | links, accents, the cursor, ornaments |
| `tertiary` | hover colour, second accent |
| `highlight` | blockquote tint, selected search result |
| `textHighlight` | `==highlighted==` text |

Want a different accent? Change `secondary` (and `tertiary` for hover) in both `lightMode` and `darkMode`. The palettes in `themes/<name>/theme.json` are just ready-made sets of these nine values; copy one as a starting point.

## 2. Knobs: the top of each `custom.scss`

Each theme's stylesheet opens with a handful of SCSS variables. Edit the copy at `quartz/styles/custom.scss` (the installed one), then rebuild.

### Field Notes

```scss
$measure: 42rem;          // width of the reading column (try 38rem for tighter, 48rem for wider)
$base-size: 17px;         // root font size
$ornament: "\2767";       // fleuron before the site name ("" for none)
$rule-ornament: "\2766";  // ornament that replaces horizontal rules
$signoff: "";             // short italic line above the footer, e.g. "tended by hand"
```

Field Notes hides the Explorer, Graph, and Table of Contents because a reading column does not want them. To bring one back, delete its selector from the `display: none` block near the top of the file; the component will appear in the coda under each note.

## 3. Your own CSS goes at the bottom

Add your rules at the **end** of `quartz/styles/custom.scss`, below the theme. Later rules win, and everything in `custom.scss` already outranks Quartz's base styles (Quartz wraps its own CSS in a cascade layer; your file is unlayered, so you never need `!important`).

If you run the installer again it will replace `custom.scss` with the theme's file, so keep your additions somewhere you can paste them back (a `my-overrides.scss` next to your config works well: then `@use "./my-overrides";` at the bottom is a one-liner to restore).

## 4. Fonts

Fonts are set in two places on purpose: `configuration.theme.typography` (so Quartz loads them from Google Fonts) and a `:root` block at the top of the stylesheet (so the stock fonts plugin cannot override them). Change both to the same names if you swap fonts. Any Google Fonts family works.

Want self-hosted fonts with no Google request? Set `fontOrigin: local` in the config and follow Quartz's own fonts documentation; the stylesheet does not care where the font files come from.
