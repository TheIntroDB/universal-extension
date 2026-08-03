import type { MediaContext } from "./types"
import {
  extractJsonLd,
  extractMediaTypeFromJsonLd,
  extractSeasonEpisodeFromJsonLd,
  extractTitleFromJsonLd,
  parseSeasonEpisodeFromBody
} from "./utils"

const ONEPLAY_URL = /^https?:\/\/(www\.)?oneplay\.(cz|sk)\//i

// Written by the MAIN-world bridge (src/contents/oneplay-bridge.ts). Oneplay
// keeps the player state in window.__NUXT__, which this isolated content script
// cannot read directly.
const BRIDGE_ATTR = "data-introdb-oneplay"

// og:title is the same marketing string on every Oneplay page, and the player
// page briefly titles itself "Přehrávač" before the show name lands. Neither is
// a usable media title.
const GENERIC_TITLES = [
  /^oneplay$/i,
  /^p[řr]ehr[áa]va[čc]$/i,
  /^vyhled[áa]t$/i,
  /^dom[ůu]$/i,
  /sledujte filmy, seri[áa]ly/i
]

export function matchOneplay(url: string): boolean {
  return ONEPLAY_URL.test(url)
}

// ---------------------------------------------------------------------------
// Title helpers
// ---------------------------------------------------------------------------
// Oneplay page titles come in three shapes:
//   "Jumanji: Vítejte v džungli! | Oneplay"
//   "Survivor USA | Oneplay"
//   "Survivor USA - Sledujte celé díly online | Oneplay"   (show landing page)
function cleanTitle(title: string): string {
  return title
    .replace(/\s*[-|–]\s*Oneplay\s*$/i, "")
    .replace(/\s*[-|–]\s*Sledujte[^-|–]*$/i, "")
    .trim()
}

function isGenericTitle(title: string): boolean {
  const trimmed = title.trim()
  if (!trimmed) return true
  return GENERIC_TITLES.some((pattern) => pattern.test(trimmed))
}

// Returns the title only when it is something we can actually look up.
function usableTitle(raw: string | null | undefined): string | null {
  if (!raw) return null
  const cleaned = cleanTitle(raw)
  return cleaned && !isGenericTitle(cleaned) ? cleaned : null
}

// ---------------------------------------------------------------------------
// Number helpers
// ---------------------------------------------------------------------------
function toNum(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null
  if (typeof v === "string") {
    // Oneplay stores the season as a label, e.g. "45. série" / "45. séria".
    const n = parseInt(v.trim(), 10)
    return isNaN(n) ? null : n
  }
  return null
}

// ---------------------------------------------------------------------------
// Bridge snapshot
// ---------------------------------------------------------------------------
interface BridgeSnapshot {
  v?: number
  href?: string
  contentType?: string | null
  overlayTitle?: string | null
  overlaySubTitle?: string | null
  contentId?: string | null
  contentTitle?: string | null
  contentTypeRaw?: string | null
  season?: string | number | null
  episodeNumber?: string | number | null
  parentTitle?: string | null
}

// The Pinia stores keep the previously viewed item around after a client-side
// navigation, so a snapshot is only trusted when its content id matches the id
// in the current URL.
function contentIdFromUrl(url: string): string | null {
  const episode = url.match(/\/epizoda\/(\d+)/i)
  if (episode) return `episode.${episode[1]}`
  const movie = url.match(/\/film\/(\d+)/i)
  if (movie) return `movie.${movie[1]}`
  const show = url.match(/\/porad\/(\d+)/i)
  if (show) return `show.${show[1]}`
  return null
}

function readBridgeSnapshot(url: string): BridgeSnapshot | null {
  try {
    const raw = document.documentElement?.getAttribute(BRIDGE_ATTR)
    if (!raw) return null

    const snapshot = JSON.parse(raw) as BridgeSnapshot
    if (!snapshot || typeof snapshot !== "object") return null

    // Require a positive match: pages that carry no content id in the URL
    // (home, search, live TV) can still have a video element playing a trailer
    // in the background while the player store holds the last watched item.
    const expectedId = contentIdFromUrl(url)
    if (!expectedId || snapshot.contentId !== expectedId) return null

    return snapshot
  } catch {
    return null
  }
}

function extractFromBridge(url: string): {
  title: string | null
  season: number | null
  episode: number | null
  type: "tv" | "movie" | null
} | null {
  const snapshot = readBridgeSnapshot(url)
  if (!snapshot) return null

  const rawType = (
    snapshot.contentType ||
    snapshot.contentTypeRaw ||
    ""
  ).toLowerCase()
  const isTV = rawType === "episode" || Boolean(snapshot.parentTitle)

  // For episodes the show name lives in contentData.parent; contentData.title
  // is the episode name ("1. díl - My to dokážeme"), which is not what
  // TheIntroDB is keyed on.
  const title = isTV
    ? usableTitle(snapshot.parentTitle) || usableTitle(snapshot.overlayTitle)
    : usableTitle(snapshot.overlayTitle) || usableTitle(snapshot.contentTitle)

  if (!title) return null

  return {
    title,
    season: isTV ? toNum(snapshot.season) : null,
    episode: isTV ? toNum(snapshot.episodeNumber) : null,
    type: isTV ? "tv" : rawType === "movie" ? "movie" : null
  }
}

// ---------------------------------------------------------------------------
// Heuristics for Czech season/episode patterns in body text.
// E.g. "1. díl", "Díl 5", "Série 2, Epizoda 3", "45. série", "Řada 1"
// ---------------------------------------------------------------------------
function parseCzechSeasonEpisode(bodyText: string): {
  season: number | null
  episode: number | null
} {
  if (!bodyText) return { season: null, episode: null }

  // "Série X, Epizoda Y" / "Séria X, Epizóda Y"
  const serieEpizoda = bodyText.match(
    /S[eé]ri[eá]\s+(\d+)[,\s]+[Ee]pizod[aá]\s+(\d+)/i
  )
  if (serieEpizoda) {
    return {
      season: parseInt(serieEpizoda[1], 10),
      episode: parseInt(serieEpizoda[2], 10)
    }
  }

  // "Řada X, díl Y" / "Řada X, epizoda Y"
  const rada = bodyText.match(
    /[Řř]ada\s+(\d+)[,\s]+(?:[Dd][ií]l|[Ee]pizod[aá])\s+(\d+)/i
  )
  if (rada) {
    return {
      season: parseInt(rada[1], 10),
      episode: parseInt(rada[2], 10)
    }
  }

  // Ordinal labels used across Oneplay, in either order:
  // "1. díl - My to dokážeme, 45. série"
  const ordinalSeason = bodyText.match(/(\d+)\.\s*(?:s[eé]ri[eá]|[řr]ada)\b/i)
  const ordinalEpisode = bodyText.match(/(\d+)\.\s*(?:d[ií]l|epizod[aá])\b/i)
  if (ordinalSeason || ordinalEpisode) {
    return {
      season: ordinalSeason ? parseInt(ordinalSeason[1], 10) : null,
      episode: ordinalEpisode ? parseInt(ordinalEpisode[1], 10) : null
    }
  }

  // Standard S01E01 etc. via shared utility
  return parseSeasonEpisodeFromBody(bodyText)
}

// "…/epizoda/3913315-1-dil-my-to-dokazeme" → episode 1
function parseEpisodeFromUrl(url: string): number | null {
  const match = url.match(/\/epizoda\/\d+-(\d+)-d[ií]l/i)
  return match ? parseInt(match[1], 10) : null
}

// ---------------------------------------------------------------------------
// TMDB resolution
// ---------------------------------------------------------------------------
// Oneplay exposes no TMDB id, and the skip-button flow drops any context
// without one (see makeMediaKey in src/contents/main.ts). Resolve it from the
// title the same way the Netflix extractor does.
interface DiscoveryResponse {
  status?: string
  tmdb_id?: number
}

// Extraction runs on a poll, so remember what a title resolved to.
const tmdbIdCache = new Map<string, number | null>()

async function resolveTmdbId(
  title: string,
  isTV: boolean,
  season: number | null,
  episode: number | null
): Promise<number | null> {
  const cacheKey = `${title}|${isTV ? "tv" : "movie"}|${season ?? ""}|${episode ?? ""}`
  const cached = tmdbIdCache.get(cacheKey)
  if (cached !== undefined) return cached

  try {
    const response = (await chrome.runtime.sendMessage({
      action: "resolveAndFetch",
      data: {
        title,
        isTV,
        season: season ?? undefined,
        episode: episode ?? undefined
      }
    })) as DiscoveryResponse | undefined

    const tmdbId =
      typeof response?.tmdb_id === "number" ? response.tmdb_id : null
    tmdbIdCache.set(cacheKey, tmdbId)
    return tmdbId
  } catch {
    // Background worker asleep or extension reloading — retry on the next poll
    // rather than caching the miss.
    return null
  }
}

// ---------------------------------------------------------------------------
// Main extractor
// ---------------------------------------------------------------------------
export async function extractOneplay(
  url: string,
  documentTitle: string,
  bodyText: string,
  currentTime = 0
): Promise<MediaContext> {
  let title: string | undefined
  let season: number | null = null
  let episode: number | null = null
  let type: "tv" | "movie" | null = null

  // 1. MAIN-world bridge — the only source that carries the season number.
  const bridged = extractFromBridge(url)
  if (bridged) {
    title = bridged.title
    season = bridged.season
    episode = bridged.episode
    type = bridged.type
  }

  // 2. JSON-LD — absent on Oneplay content pages today, kept as a cheap guard
  //    in case they start emitting it.
  if (!title || season === null || episode === null) {
    const jsonLd = extractJsonLd()
    if (jsonLd) {
      if (!title)
        title = usableTitle(extractTitleFromJsonLd(jsonLd)) ?? undefined
      const se = extractSeasonEpisodeFromJsonLd(jsonLd)
      if (season === null) season = se.season
      if (episode === null) episode = se.episode
      if (!type) type = extractMediaTypeFromJsonLd(jsonLd)
    }
  }

  // 3. Document title. Deliberately preferred over og:title, which is the same
  //    generic marketing string on every Oneplay page.
  if (!title) {
    title = usableTitle(documentTitle) ?? undefined
  }

  // 4. Season/episode from the page text and the episode URL slug.
  if (season === null || episode === null) {
    const se = parseCzechSeasonEpisode(bodyText)
    if (season === null) season = se.season
    if (episode === null) episode = se.episode
  }
  if (episode === null) {
    episode = parseEpisodeFromUrl(url)
  }

  const isTV = type === "tv" || season !== null || episode !== null

  // A TV context with an unknown season or episode is worse than no context at
  // all: the discovery path falls back to season 1 / episode 1 (see
  // background.ts), which would place skip buttons using another episode's
  // timestamps. Resolving no id keeps the skip button off instead.
  const canResolve =
    Boolean(title) && (!isTV || (season !== null && episode !== null))
  const tmdbId = canResolve
    ? await resolveTmdbId(title as string, isTV, season, episode)
    : null

  return {
    title: title || "Oneplay",
    tmdb_id: tmdbId,
    type: isTV ? "tv" : "movie",
    season: isTV ? season : null,
    episode: isTV ? episode : null,
    episode_id: null,
    currentTime
  }
}
