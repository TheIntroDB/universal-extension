// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 TheIntroDB

// ---------------------------------------------------------------------------
// Set of recognised schema.org types that represent media content
// ---------------------------------------------------------------------------
const MEDIA_TYPES = new Set([
  "TVEpisode",
  "Movie",
  "TVSeries",
  "MovieSeries",
  "VideoObject",
  "Clip",
  "TVSeason",
  "CreativeWorkSeason",
  "CreativeWorkSeries"
])

// Priority types — return these immediately when found
const PRIORITY_TYPES = new Set(["TVEpisode", "Movie", "VideoObject"])

export function parseSeasonEpisodeFromBody(bodyText: string): {
  season: number | null
  episode: number | null
} {
  if (!bodyText) return { season: null, episode: null }

  // Standard patterns: capture group 1 = season, 2 = episode
  const standardPatterns: RegExp[] = [
    /S(\d+)\s*[E:]\s*E?(\d+)/i,
    /S(\d+)\s*,\s*E(\d+)/i,
    /(\d+)x(\d+)/i,
    /Season\s+(\d+)[,\s]+Episode\s+(\d+)/i,
    /Season\s+(\d+)[:\s]+Episode\s+(\d+)/i,
    /S(\d{2})\s*[.\s]?E(\d{2})/i
  ]

  for (const pattern of standardPatterns) {
    const match = bodyText.match(pattern)
    if (match) {
      return { season: parseInt(match[1], 10), episode: parseInt(match[2], 10) }
    }
  }

  // "Episode X of Season Y" — captures are reversed
  const episodeOfSeasonMatch = bodyText.match(
    /Episode\s+(\d+)\s+of\s+Season\s+(\d+)/i
  )
  if (episodeOfSeasonMatch) {
    return {
      season: parseInt(episodeOfSeasonMatch[2], 10),
      episode: parseInt(episodeOfSeasonMatch[1], 10)
    }
  }

  return { season: null, episode: null }
}

// ---------------------------------------------------------------------------
// Helper: extract @type from an item (handles string or array forms)
// ---------------------------------------------------------------------------
function getJsonLdType(item: Record<string, unknown>): string | null {
  const type = item["@type"]
  if (typeof type === "string") return type
  if (Array.isArray(type)) {
    // Return the first recognised media type in the array
    for (const t of type) {
      if (typeof t === "string" && MEDIA_TYPES.has(t)) return t
    }
    return typeof type[0] === "string" ? type[0] : null
  }
  return null
}

// ---------------------------------------------------------------------------
// Helper: coerce a JSON-LD number to number | null
// ---------------------------------------------------------------------------
function toNum(v: unknown): number | null {
  if (typeof v === "number") return v
  if (typeof v === "string") {
    const n = parseInt(v, 10)
    return isNaN(n) ? null : n
  }
  return null
}

// ---------------------------------------------------------------------------
// Extract the best JSON-LD media item from the page.
//
// Handles:
//  - Priority types: TVEpisode, Movie, VideoObject (returned immediately)
//  - Secondary types: TVSeries, MovieSeries, TVSeason, Clip, etc.
//  - @type as string or array (e.g. ["TVEpisode", "VideoObject"])
//  - mainEntity / about properties (e.g. WebPage > mainEntity > TVEpisode)
//  - @graph (multiple items in a single script block)
//  - Multiple <script type="application/ld+json"> blocks
//  - Fallback to any item with media-related properties (episodeNumber,
//    partOfSeason, duration, etc.)
// ---------------------------------------------------------------------------
export function extractJsonLd(): Record<string, unknown> | null {
  try {
    const scripts = document.querySelectorAll(
      'script[type="application/ld+json"]'
    )

    let bestItem: Record<string, unknown> | null = null
    let bestScore = -1

    for (const script of scripts) {
      const text = script.textContent
      if (!text) continue

      let data: Record<string, unknown>
      try {
        data = JSON.parse(text)
      } catch {
        continue
      }

      const items: Record<string, unknown>[] = (data["@graph"] as
        | Record<string, unknown>[]
        | undefined) || [data]

      for (const item of items) {
        // Check mainEntity or about — sites often wrap media in WebPage
        const mainEntity = (item.mainEntity || item.about) as
          | Record<string, unknown>
          | undefined
        if (mainEntity) {
          const mainType = getJsonLdType(mainEntity)
          if (mainType && MEDIA_TYPES.has(mainType)) {
            // Found via mainEntity — strong match
            if (PRIORITY_TYPES.has(mainType)) return mainEntity
            if (3 > bestScore) {
              bestItem = mainEntity
              bestScore = 3
            }
          }
        }

        // Check the item's own @type
        const type = getJsonLdType(item)
        if (type && MEDIA_TYPES.has(type)) {
          // Priority types — best possible match
          if (PRIORITY_TYPES.has(type)) return item

          // Score secondary types by specificity
          const isSeries = type === "TVSeries" || type === "CreativeWorkSeries"
          const score = isSeries ? 3 : 2
          if (score > bestScore) {
            bestItem = item
            bestScore = score
          }

          // If we found a Clip, also check its partOfEpisode
          if (type === "Clip") {
            const partOfEpisode = item.partOfEpisode as
              | Record<string, unknown>
              | undefined
            if (partOfEpisode && getJsonLdType(partOfEpisode) === "TVEpisode") {
              return partOfEpisode
            }
          }
        } else if (item.name || item.alternateName) {
          // Item has a name but no recognised media type — score it if it
          // has media-related properties
          const hasMediaProps = Boolean(
            item.episodeNumber ||
              (item as Record<string, unknown>).seasonNumber ||
              item.partOfSeason ||
              item.partOfSeries ||
              item.duration ||
              item.thumbnailUrl
          )
          if (hasMediaProps && 1 > bestScore) {
            bestItem = item
            bestScore = 1
          }
        }
      }
    }

    return bestItem
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Extract season and episode numbers from a JSON-LD media item.
//
// Handles:
//  - TVEpisode:       partOfSeason.seasonNumber + episodeNumber
//  - VideoObject:     episodeNumber + partOfSeason.seasonNumber
//  - Clip:            partOfEpisode.episodeNumber + partOfSeason.seasonNumber
//  - TVSeason:        direct seasonNumber property
//  - position         fallback when episodeNumber is absent
// ---------------------------------------------------------------------------
export function extractSeasonEpisodeFromJsonLd(
  jsonLd: Record<string, unknown>
): { season: number | null; episode: number | null } {
  let episode: unknown = jsonLd.episodeNumber
  let season: unknown = null

  // 1. Check partOfSeason (used by TVEpisode, VideoObject)
  const partOfSeason = jsonLd.partOfSeason as
    | Record<string, unknown>
    | undefined
  if (partOfSeason) {
    season = partOfSeason.seasonNumber ?? null
  }

  // 2. Check partOfEpisode for Clip types — don't gate on season here
  //    because a Clip may have episodeNumber only in partOfEpisode even
  //    when season was already found via partOfSeason.
  if (episode === undefined) {
    const partOfEpisode = jsonLd.partOfEpisode as
      | Record<string, unknown>
      | undefined
    if (partOfEpisode) {
      if (episode === undefined) episode = partOfEpisode.episodeNumber
      const epSeason = partOfEpisode.partOfSeason as
        | Record<string, unknown>
        | undefined
      if (epSeason && season === null) {
        season = epSeason.seasonNumber ?? null
      }
    }
  }

  // 3. Direct seasonNumber (TVSeason, CreativeWorkSeason)
  if (season === null) {
    const sn = (jsonLd as Record<string, unknown>).seasonNumber
    if (sn !== undefined) season = sn
  }

  // 4. Use position as fallback for episode number
  //    (some sites use position in list/array contexts)
  if (episode === undefined) {
    const pos = jsonLd.position
    if (pos !== undefined && typeof pos === "number") episode = pos
  }

  return {
    season: toNum(season),
    episode: toNum(episode)
  }
}

// ---------------------------------------------------------------------------
// Extract the title from a JSON-LD media item.
//
// For episode-level items (TVEpisode, VideoObject, Clip) this prefers
// the series/show name from partOfSeries over the episode's own name,
// so we get "From" instead of "Licensed to Love and Kill".
// ---------------------------------------------------------------------------
export function extractTitleFromJsonLd(
  jsonLd: Record<string, unknown>
): string | null {
  // Helper: safely get a string property from a nested object
  const getObjName = (obj: unknown): string | null => {
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      const val = (obj as Record<string, unknown>).name
      return typeof val === "string" ? val.trim() || null : null
    }
    return null
  }

  // 1. Try partOfSeries (used by VideoObject, Clip, and sometimes TVEpisode)
  const directSeries = getObjName(jsonLd.partOfSeries)
  if (directSeries) return directSeries

  // 2. Try partOfSeason.partOfSeries (standard TVEpisode pattern)
  const partOfSeason = jsonLd.partOfSeason as
    | Record<string, unknown>
    | undefined
  if (partOfSeason) {
    const nestedSeries = getObjName(partOfSeason.partOfSeries)
    if (nestedSeries) return nestedSeries
  }

  // 3. Try partOfEpisode.partOfSeason.partOfSeries (Clip pattern)
  const partOfEpisode = jsonLd.partOfEpisode as
    | Record<string, unknown>
    | undefined
  if (partOfEpisode) {
    const epSeason = partOfEpisode.partOfSeason as
      | Record<string, unknown>
      | undefined
    if (epSeason) {
      const clipSeries = getObjName(epSeason.partOfSeries)
      if (clipSeries) return clipSeries
    }
  }

  // 4. Fall back to direct name fields (episode title, movie title,
  //    series title when the item IS the series itself)
  const candidate =
    (jsonLd.name as string) ||
    (jsonLd.alternateName as string) ||
    (jsonLd.title as string) ||
    (jsonLd.headline as string) ||
    null
  return candidate?.trim() || null
}

// ---------------------------------------------------------------------------
// Extract media type hint from JSON-LD @type.
// Returns "tv", "movie", or null if ambiguous.
// ---------------------------------------------------------------------------
export function extractMediaTypeFromJsonLd(
  jsonLd: Record<string, unknown>
): "tv" | "movie" | null {
  const type = getJsonLdType(jsonLd)
  if (!type) return null

  // Types that clearly indicate TV content
  if (
    type === "TVEpisode" ||
    type === "TVSeries" ||
    type === "TVSeason" ||
    type === "Clip" ||
    type === "CreativeWorkSeason" ||
    type === "CreativeWorkSeries"
  ) {
    return "tv"
  }
  // Types that clearly indicate Movie content
  if (type === "Movie" || type === "MovieSeries") {
    return "movie"
  }
  // VideoObject is ambiguous (could be movie trailer, episode clip, etc.)
  // Check if it has season/episode info for tv hint
  if (type === "VideoObject") {
    if (jsonLd.partOfSeason || jsonLd.partOfSeries || jsonLd.episodeNumber) {
      return "tv"
    }
    // Could still be a movie trailer or clip — return null
  }
  return null
}

export function extractMetaTitle(): string {
  const og = document
    .querySelector('meta[property="og:title"]')
    ?.getAttribute("content")
  const tw = document
    .querySelector('meta[name="twitter:title"]')
    ?.getAttribute("content")
  const ogVideo = document
    .querySelector('meta[property="og:video:title"]')
    ?.getAttribute("content")
  return og || tw || ogVideo || ""
}

export function getFirstBodyLine(bodyText: string): string | null {
  const match = bodyText.match(/^(?:#\s*)?(.+?)(?:\s*\n|$)/)
  return match ? match[1].trim() : null
}
