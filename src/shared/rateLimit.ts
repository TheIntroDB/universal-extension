/**
 * How long to wait out a 429 from TheIntroDB.
 *
 * The API shapes both of its 429s the same way -- same JSON keys, same
 * `Retry-After` -- and uses `code` as the only discriminator, so one parser
 * covers both kinds. The rules are in TheIntroDB/.github
 * `docs/rate-limit-contract.md`; this module is the extension's implementation
 * of them.
 *
 * `Retry-After` is the one field guaranteed to be there. A burst 429 carries no
 * `X-RateLimit-*` counters at all, so a client that reads those first -- as this
 * one used to -- finds nothing on exactly the response that needs it.
 */

/**
 * - `rate`: the per-window ceiling (10s). Worth retrying shortly.
 * - `usage`: the day's budget is spent. Nothing clears it before UTC midnight,
 *   so stop asking rather than wake up and be refused again.
 */
export type RateLimitKind = "rate" | "usage"

/**
 * "title" means the budget for one media target is spent
 * (`specific_media_usage_limit_exceeded`); "account" means the caller's own.
 * A per-title limit must not stop lookups for other titles.
 */
export type RateLimitScope = "title" | "account"

export interface RateLimit {
  kind: RateLimitKind
  /** Seconds to wait, always usable: 1..86400. */
  reset: number
  scope: RateLimitScope
}

/** A daily budget resets at UTC midnight, so nothing is worth waiting longer
 * than a day. Clamping *down* to the burst window is the bug this exists to
 * avoid: it turns "come back tomorrow" into "come back in five minutes". */
const MAX_WAIT_SECONDS = 24 * 60 * 60

/** Only for a 429 that carries no usable number at all. */
const FALLBACK_WAIT_SECONDS = 60

/** A daily reset is hours away, so a wait longer than this cannot be a burst.
 * Only consulted when the body carries no `code` (a proxy's 429, say), and set
 * to 300s to match jellyfin-plugin, emby-plugin and kodi-addon -- all four then
 * read an unknown 429 the same way. */
const USAGE_WAIT_FLOOR_SECONDS = 300

const USAGE_CODES = new Set([
  "usage_limit_exceeded",
  "specific_media_usage_limit_exceeded"
])

/** RFC 9110 allows delta-seconds or an HTTP-date; the API sends delta-seconds.
 * The date branch only exists so a proxy's 429 is not silently read as zero. */
function parseHeaderSeconds(value: string | null): number | null {
  if (!value) return null

  const seconds = Number(value)
  if (Number.isFinite(seconds)) return seconds

  const date = Date.parse(value)
  if (!Number.isNaN(date)) return Math.ceil((date - Date.now()) / 1000)

  return null
}

/** The API's human form: "10 seconds", "14.0 hours". */
function parseHumanSeconds(value: unknown): number | null {
  if (typeof value !== "string") return null

  const match = value.trim().match(/^([\d.]+)\s*(second|minute|hour|day)s?$/i)
  if (!match) return null

  const amount = Number(match[1])
  if (!Number.isFinite(amount)) return null

  const unit = match[2].toLowerCase()
  const perUnit =
    unit === "second"
      ? 1
      : unit === "minute"
        ? 60
        : unit === "hour"
          ? 3600
          : 86400

  return amount * perUnit
}

function positive(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null
}

/**
 * Reads a 429 into the wait and the policy.
 *
 * The wait comes from `Retry-After` first, then the body's
 * `retry_after_seconds`, then either reset header, then the body's
 * `retry_after` string, and finally a minute. `code` decides only whether the
 * caller should keep going (`rate`) or stop until the window rolls over
 * (`usage`) -- never how long to wait, which is why a daily 429 keeps its
 * multi-hour `Retry-After` instead of being trimmed to the burst window.
 */
export function rateLimitFrom(
  headers: Headers,
  body: unknown = null
): RateLimit {
  const payload = (body ?? {}) as Record<string, unknown>
  const code = typeof payload.code === "string" ? payload.code : ""

  const wait =
    parseHeaderSeconds(headers.get("Retry-After")) ??
    positive(payload.retry_after_seconds) ??
    parseHeaderSeconds(headers.get("X-UsageLimit-Reset")) ??
    parseHeaderSeconds(headers.get("X-RateLimit-Reset")) ??
    parseHumanSeconds(payload.retry_after) ??
    FALLBACK_WAIT_SECONDS

  const reset = Math.min(Math.max(Math.ceil(wait), 1), MAX_WAIT_SECONDS)

  const kind: RateLimitKind = USAGE_CODES.has(code)
    ? "usage"
    : code === "rate_limit_exceeded"
      ? "rate"
      : reset > USAGE_WAIT_FLOOR_SECONDS
        ? "usage"
        : "rate"

  // Only the per-title code is spent for one target; anything else -- including
  // a duration-only guess -- is the caller's own budget.
  const scope: RateLimitScope =
    code === "specific_media_usage_limit_exceeded" ? "title" : "account"

  return { kind, reset, scope }
}
