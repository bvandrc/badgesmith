import { type BadgeOptions, TRANSPARENT } from '../render.ts'

/**
 * The badge shown in the README; `sample.svg` is generated from it.
 *
 * 18px to sit on a line of text, which is how a README embeds one.
 */
export const SAMPLE_INPUT = {
  items: [
    { icon: 'git-commit', value: '370' },
    { icon: 'git-pull-request', value: '264' },
  ],
  height: 18,
} satisfies BadgeOptions

/**
 * What each fixture SVG under this folder was rendered from, keyed by its
 * filename. `SAMPLE_INPUT` is not among them: it has its own file at the
 * repository root, pinned by its own test.
 *
 * `scripts/generate-svg.ts` writes one file per entry and `render.test.ts`
 * compares against them, so the two cannot disagree about what is pinned. Add
 * an entry, run `pnpm gen:svg`, and read the diff to see what it renders.
 */
export const TEST_FIXTURE_INPUTS = {
  // logo-github's viewBox is 49x16, so it must advance by its own width
  'non-square-icon': {
    items: [{ icon: 'logo-github', value: '1' }],
  },
  // every dimension scales from height
  tall: {
    items: [{ icon: 'star', value: '12345' }],
    height: 48,
  },
  // the full style surface in one go. The colors are deliberately chromatic
  // and differently ordered — every channel differs within each one, and the
  // three run mid/low/high, high/mid/low and low/mid/high — so a swapped or
  // reversed channel would change these bytes. White, black and grey would
  // hide it. One 6-digit and two 3-digit, to cover both hex lengths.
  styled: {
    items: [
      { icon: 'star', value: '98' },
      { icon: 'repo-forked', value: '7' },
    ],
    color: '3a1b6f',
    iconColor: 'fa3',
    textColor: '0cf',
    height: 28,
    radius: 6,
  },
  // no background element at all, with colors that read on a light page and a
  // dark one alike — what a README embeds when it wants no pill
  transparent: {
    items: [
      { icon: 'git-commit', value: '547' },
      { icon: 'git-pull-request', value: '0' },
    ],
    color: TRANSPARENT,
    iconColor: '6E7681',
    textColor: '6E7681',
    height: 12,
  },
  // no padding above or below: the contents keep the size the default
  // proportions give them and the pill shrinks to meet them
  'trimmed-padding': {
    items: [
      { icon: 'git-commit', value: '87' },
      { icon: 'git-pull-request', value: '44' },
    ],
    height: 14,
    padY: 0,
  },
  // each icon drawn after its own value instead of before it
  'icon-right': {
    items: [
      { icon: 'git-commit', value: '370' },
      { icon: 'git-pull-request', value: '264' },
    ],
    iconSide: 'right',
  },
  // a value on its own, beside a pair, so the fixture pins both forms and
  // the gap the icon-less one does not take
  'text-only': {
    items: [{ value: 'repo' }, { icon: 'star', value: '9' }],
  },
  // an icon drawn nearer its value's size than the height's
  'icon-scaled': {
    items: [{ icon: 'file-directory', value: 'repo' }],
    iconScale: 0.7,
  },
  // markup in a value has to come out escaped, not rendered
  'escaped-value': {
    items: [{ icon: 'tag', value: '<b>&"' }],
  },
  // the widest thing the route will accept: six items, 12-character values
  'six-items': {
    items: [
      { icon: 'git-commit', value: '999999999999' },
      { icon: 'git-pull-request', value: '1.2M' },
      { icon: 'star', value: '0' },
      { icon: 'repo-forked', value: '42' },
      { icon: 'issue-opened', value: '7' },
      { icon: 'tag', value: 'v10.0.0' },
    ],
  },
} satisfies Record<string, BadgeOptions>
