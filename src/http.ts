/**
 * Header names this worker sets or reads.
 *
 * Lowercased, matching how the Headers API normalises them, so a name used as
 * a literal key and one passed to `headers.get` are the same string.
 */
export const HEADERS = {
  CONTENT_TYPE: 'content-type',
  CACHE_CONTROL: 'cache-control',
  ACCEPT: 'accept',
  AUTHORIZATION: 'authorization',
  USER_AGENT: 'user-agent',
  LINK: 'link',
} as const

/**
 * Content types this worker serves or asks for.
 *
 * The charset is part of each value so it can be used verbatim: GitHub's image
 * proxy sends `X-Content-Type-Options: nosniff`, and an SVG served as anything
 * other than the exact type below renders nothing.
 */
export const CONTENT_TYPES = {
  SVG: 'image/svg+xml; charset=utf-8',
  PLAIN_TEXT: 'text/plain; charset=utf-8',
  HTML: 'text/html; charset=utf-8',
  GITHUB_JSON: 'application/vnd.github+json',
} as const

/**
 * A request the caller can fix. Its message is sent back as the 400 body, so
 * it has to read as an explanation rather than an internal detail.
 *
 * Only this type becomes a 400 — anything else thrown is a bug and propagates,
 * so a broken handler surfaces as a 500 instead of a misleading 400.
 */
export class BadRequestError extends Error {}
