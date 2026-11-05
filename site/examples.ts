/** The deployed worker, which every badge the README shows is fetched from. */
export const WORKER_ORIGIN = 'https://badgesmith.bvandrc.workers.dev'

/** One badge both the README and the landing page demonstrate. */
export type Example = {
  /** what the badge shows off, which doubles as its alt text */
  title: string
  /** the path and query the worker renders it from */
  path: string
}

/** The badge the README opens on. */
export const HERO = {
  title: '370 commits, 264 pull requests',
  path: '/?items=git-commit:370,git-pull-request:264',
} satisfies Example

/** The examples the README and the landing page both list, in order. */
export const EXAMPLES: readonly Example[] = [
  {
    title: 'Live numbers for any public repo, looked up by the worker',
    path: '/github?repo=bvandrc/badgesmith',
  },
  {
    title: 'Your own colors, rounded corners',
    path: '/?items=star:1.2k,repo-forked:89,eye:42&color=1f6feb&iconColor=fff&radius=6',
  },
  {
    title: 'Status and version, not just counts',
    path: '/?items=check-circle:passing,shield-check:A%2B,versions:v2.1.0&color=1a7f37&iconColor=fff',
  },
  {
    title: 'A value with no icon reads as a label, and an emoji can mark it',
    path: '/?items=%F0%9F%9A%80%20stable,tag:v2.1.0,law:MIT&color=8250df&iconColor=fff',
  },
  {
    title: 'Up to six items',
    path: '/?items=issue-opened:12,issue-closed:340,git-merge:211,comment-discussion:58,people:23,heart:1k&radius=4',
  },
  {
    title: 'Bold values, fully rounded',
    path: '/?items=flame:hot,zap:fast,rocket:shipped&color=bf3989&iconColor=fff&bold=true&radius=10',
  },
  {
    title: 'Taller, as a pill',
    path: '/?items=logo-github:49,tag:v2.1.0&height=28&radius=14',
  },
  {
    title: 'Icons after their values',
    path: '/?items=git-commit:370,git-pull-request:264&iconSide=right',
  },
  {
    title: 'Light pill, dark text',
    path: '/?items=clock:2h,calendar:Nov%202026&color=f6f8fa&textColor=1f2328&iconColor=59636e&radius=6',
  },
  {
    title: 'No background — reads as a link',
    path: '/?items=book:docs&bold=true&underline=true&color=none&textColor=0969da&iconColor=0969da&iconScale=0.7',
  },
  {
    title: 'A label alone, underlined',
    path: '/?items=react-toolkit&bold=true&underline=true&color=none&textColor=0969da',
  },
  {
    title: 'No background, compact, legible on light and dark themes',
    path: '/?items=git-commit:547,git-pull-request:0&color=none&iconColor=6E7681&textColor=6E7681&height=14&padY=0',
  },
]
