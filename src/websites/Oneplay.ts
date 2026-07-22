import type { MediaContext } from "./types"
import {
  extractJsonLd,
  extractMediaTypeFromJsonLd,
  extractMetaTitle,
  extractSeasonEpisodeFromJsonLd,
  extractTitleFromJsonLd,
  parseSeasonEpisodeFromBody
} from "./utils"

const ONEPLAY_URL = /^https?:\/\/(www\.)?oneplay\.(cz|sk)\//i

function cleanTitle(title: string): string {
  return title.replace(/\s*[-|–]\s*Oneplay.*$/i, "").trim()
}

export function matchOneplay(url: string): boolean {
  return ONEPLAY_URL.test(url)
}

// ---------------------------------------------------------------------------
// Heuristics for Czech season/episode patterns in body text.
// E.g. "1. díl", "Díl 5", "Série 2, Epizoda 3", "Řada 1"
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

  // "X. díl" (episode only)
  const dilMatch = bodyText.match(/(\d+)\.\s*[Dd][ií]l\b/)
  if (dilMatch) {
    return { season: null, episode: parseInt(dilMatch[1], 10) }
  }

  // Standard S01E01 etc. via shared utility
  return parseSeasonEpisodeFromBody(bodyText)
}

// ---------------------------------------------------------------------------
// Try extracting from Nuxt embedded state (__NUXT_DATA__)
// ---------------------------------------------------------------------------
function extractFromNuxtData(): {
  title: string | null
  season: number | null
  episode: number | null
  type: "tv" | "movie" | null
} | null {
  const el =
    document.querySelector("#__NUXT_DATA__") ||
    document.querySelector("script#__NUXT_DATA__")
  if (!el) return null

  const content = (el.textContent || "").trim()
  if (!content) return null

  let jsonRoot: unknown = null
  try {
    jsonRoot = JSON.parse(content)
  } catch {
    const idx = content.indexOf("[")
    if (idx >= 0) {
      try {
        jsonRoot = JSON.parse(content.substring(idx))
      } catch {
        return null
      }
    }
  }
  if (!jsonRoot || typeof jsonRoot !== "object") return null

  const root = Array.isArray(jsonRoot) ? jsonRoot[0] : jsonRoot
  const data =
    (root as Record<string, unknown>).data ||
    (root as Record<string, unknown>).props ||
    null
  if (!data || typeof data !== "object") return null

  // Walk the object tree looking for a content/show node
  const walk = (o: unknown): Record<string, unknown> | null => {
    if (!o || typeof o !== "object") return null
    const obj = o as Record<string, unknown>
    if (obj.partOfSeries || obj.show || obj.episodeNumber || obj.contentType) {
      return obj
    }
    for (const key of Object.keys(obj)) {
      try {
        const found = walk(obj[key])
        if (found) return found
      } catch {
        // skip
      }
    }
    return null
  }

  const found = walk(data)
  if (!found) return null

  const rawType =
    (found.contentType as string) || (found.type as string) || null
  let isTV = rawType?.toLowerCase() === "episode"
  let title: string | null = null
  let season: number | null = null
  let episode: number | null = null

  if (isTV || found.partOfSeries || found.show) {
    const show = found.show as Record<string, unknown> | undefined
    const partOfSeries = found.partOfSeries as
      | Record<string, unknown>
      | undefined
    title =
      ((show && (show.title || show.name)) ||
        (partOfSeries && partOfSeries.name) ||
        found.title) as string | null
    const partOfSeason = found.partOfSeason as
      | Record<string, unknown>
      | undefined
    season =
      toNum(found.seasonNumber ?? found.season) ??
      toNum(partOfSeason?.seasonNumber) ??
      null
    episode =
      toNum(found.episodeNumber ?? found.episode) ??
      toNum(found.position) ??
      null
    isTV = true
  } else {
    title = (found.title || found.name) as string | null
    isTV = false
  }

  return {
    title: title || null,
    season,
    episode,
    type: isTV ? "tv" : rawType?.toLowerCase() === "movie" ? "movie" : null
  }
}

// ---------------------------------------------------------------------------
// Try extracting from embedded <script> tags (startAction / playerControl)
// ---------------------------------------------------------------------------
function extractFromEmbeddedScripts(): {
  title: string | null
  season: number | null
  episode: number | null
  type: "tv" | "movie" | null
} | null {
  const scripts = Array.from(document.querySelectorAll("script:not([src])"))
  for (const el of scripts) {
    const text = el.textContent
    if (!text) continue

    // Try startAction
    if (text.includes("startAction")) {
      const json = findBalancedJson(text, text.indexOf("startAction"))
      if (json) {
        const parsed = tryParse(json)
        if (parsed) {
          const data = parsed.data as Record<string, unknown> | undefined
          const sa =
            (parsed.startAction as Record<string, unknown>) ||
            (data?.startAction as Record<string, unknown>) ||
            null
          if (sa) {
            const route = (sa.route as Record<string, unknown>) || {}
            const title = (route.title || route.name) as string | null
            return { title, season: null, episode: null, type: null }
          }
        }
      }
    }

    // Try playerControl.tracking.contentData
    if (text.includes("playerControl")) {
      const pos = Math.max(
        text.indexOf("playerControl"),
        text.indexOf("playerControl.tracking")
      )
      const json = findBalancedJson(text, pos)
      if (json) {
        const parsed = tryParse(json)
        if (parsed) {
          const pc = parsed.playerControl as
            | Record<string, unknown>
            | undefined
          const tracking = (pc?.tracking || parsed.tracking) as
            | Record<string, unknown>
            | undefined
          const content =
            (parsed.content as Record<string, unknown>) || undefined
          const contentData =
            (tracking?.contentData as Record<string, unknown>) ||
            (content?.contentData as Record<string, unknown>) ||
            null
          if (contentData) {
            const rawType = (contentData.type || "") as string
            const isTV =
              rawType.toLowerCase() === "episode" || Boolean(contentData.show)
            const show = contentData.show as
              | Record<string, unknown>
              | undefined
            const title = isTV
              ? ((show?.title || show?.name || contentData.title) as string) ||
                null
              : (contentData.title as string) || null
            const season = toNum(
              contentData.season ?? contentData.seasonNumber
            )
            const episode = toNum(
              contentData.episodeNumber ?? contentData.episode
            )
            return {
              title,
              season,
              episode,
              type: isTV
                ? "tv"
                : rawType.toLowerCase() === "movie"
                  ? "movie"
                  : null
            }
          }
        }
      }
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function toNum(v: unknown): number | null {
  if (typeof v === "number") return v
  if (typeof v === "string") {
    const n = parseInt(v, 10)
    return isNaN(n) ? null : n
  }
  return null
}

function tryParse(s: string): Record<string, unknown> | null {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

function findBalancedJson(text: string, startPos: number): string | null {
  const i = text.indexOf("{", startPos)
  if (i < 0) return null
  let depth = 0
  for (let j = i; j < text.length; j++) {
    const c = text[j]
    if (c === "{") depth++
    else if (c === "}") depth--
    if (depth === 0) return text.substring(i, j + 1)
  }
  return null
}

// ---------------------------------------------------------------------------
// Main extractor
// ---------------------------------------------------------------------------
export function extractOneplay(
  url: string,
  documentTitle: string,
  bodyText: string,
  currentTime = 0
): MediaContext {
  let title: string | undefined
  let season: number | null = null
  let episode: number | null = null
  let type: "tv" | "movie" | null = null

  // 1. JSON-LD
  const jsonLd = extractJsonLd()
  if (jsonLd) {
    const jsonTitle = extractTitleFromJsonLd(jsonLd)
    if (jsonTitle) title = jsonTitle
    const se = extractSeasonEpisodeFromJsonLd(jsonLd)
    if (se.season !== null) season = se.season
    if (se.episode !== null) episode = se.episode
    type = extractMediaTypeFromJsonLd(jsonLd)
  }

  // 2. Embedded scripts (startAction / playerControl)
  if (!title || season === null || episode === null) {
    const embedded = extractFromEmbeddedScripts()
    if (embedded) {
      if (!title && embedded.title) title = embedded.title
      if (season === null) season = embedded.season
      if (episode === null) episode = embedded.episode
      if (!type && embedded.type) type = embedded.type
    }
  }

  // 3. Nuxt state
  if (!title || season === null || episode === null) {
    const nuxt = extractFromNuxtData()
    if (nuxt) {
      if (!title && nuxt.title) title = nuxt.title
      if (season === null) season = nuxt.season
      if (episode === null) episode = nuxt.episode
      if (!type && nuxt.type) type = nuxt.type
    }
  }

  // 4. Meta tags
  if (!title) {
    title = extractMetaTitle()
  }

  // 5. Body text (Czech patterns + standard)
  if (season === null || episode === null) {
    const se = parseCzechSeasonEpisode(bodyText)
    if (season === null) season = se.season
    if (episode === null) episode = se.episode
  }

  // 6. Clean document title as fallback
  if (!title) {
    title = cleanTitle(documentTitle)
  }

  const isTV = type === "tv" || season !== null || episode !== null

  return {
    title: title || "Oneplay",
    tmdb_id: null,
    type: isTV ? "tv" : type === "movie" ? "movie" : "movie",
    season: isTV ? season : null,
    episode: isTV ? episode : null,
    episode_id: null,
    currentTime
  }
}
