// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 TheIntroDB

import type { MediaContext } from "./types"
import {
  extractJsonLd,
  extractMediaTypeFromJsonLd,
  extractMetaTitle,
  extractSeasonEpisodeFromJsonLd,
  extractTitleFromJsonLd,
  getFirstBodyLine,
  parseSeasonEpisodeFromBody
} from "./utils"

function cleanDocumentTitle(title: string, domain: string): string {
  return title
    .replace(/\s*\(\d{4}\)\s*/g, "") // Remove year in parentheses
    .replace(/\s*\b(19|20)\d{2}\b\s*/g, "") // Remove standalone year
    .replace(/-\d{4}-\d+$/, "") // Remove trailing year and ID
    .replace(new RegExp(domain.replace(/\./g, "\\."), "gi"), "")
    .replace(new RegExp(domain.split(".")[0], "gi"), "")
    .replace(/Watching|Online|HD|1080p|720p|4K|Stream/gi, "")
    .replace(/\s*[-|–|—:]\s*(Watch|Stream|Full|Movie|TV\s*Show|Series).*$/i, "")
    .split(/[-|–|—]/)[0]
    .trim()
}

export async function extractGeneric(
  url: string,
  documentTitle: string,
  bodyText: string,
  currentTime = 0
): Promise<MediaContext> {
  let tmdb_id: number | null = null
  let imdb_id: string | null = null
  let season: number | null = null
  let episode: number | null = null
  let episode_id: number | null = null
  let typeHint: "tv" | "movie" | null = null
  let title: string | undefined
  let extractedYear: string | undefined

  // --------------------------------------------------------------------------
  // A. Try JSON-LD structured data first (most reliable when available)
  // --------------------------------------------------------------------------
  const jsonLd = extractJsonLd()
  if (jsonLd) {
    const jsonLdTitle = extractTitleFromJsonLd(jsonLd)
    if (jsonLdTitle) title = jsonLdTitle

    const { season: s, episode: e } = extractSeasonEpisodeFromJsonLd(jsonLd)
    if (s !== null) season = s
    if (e !== null) episode = e

    if (!extractedYear) {
      const dateReleased = jsonLd.datePublished as string | undefined
      if (dateReleased) {
        const yMatch = dateReleased.match(/\b(19|20)\d{2}\b/)
        if (yMatch) extractedYear = yMatch[0]
      }
    }
  }

  // --------------------------------------------------------------------------
  // B. Extract TMDB/IMDb IDs and season/episode from URL
  // --------------------------------------------------------------------------
  try {
    const urlObj = new URL(url)
    const params = urlObj.searchParams
    const typeParam = params.get("type")?.toLowerCase()
    if (typeParam === "tv" || typeParam === "movie") {
      typeHint = typeParam
    }

    const idParam =
      params.get("id") || params.get("tmdb_id") || params.get("tmdbId")
    if (!tmdb_id && idParam && /^\d+$/.test(idParam)) {
      tmdb_id = parseInt(idParam, 10)
    }

    // URL params for season/episode (only if JSON-LD didn't provide them)
    if (season === null) {
      const seasonParam = params.get("season")
      const sParam = params.get("s")
      const sp = seasonParam || sParam
      if (sp && /^\d+$/.test(sp)) season = parseInt(sp, 10)
    }
    if (episode === null) {
      const episodeParam = params.get("episode")
      const eParam = params.get("e")
      const ep = episodeParam || eParam
      if (ep && /^\d+$/.test(ep)) episode = parseInt(ep, 10)
    }
  } catch {
    // ignore
  }

  // TMDB ID from URL path patterns
  const tmdbTvMatch = url.match(/\/tv\/(\d+)\/(\d+)\/(\d+)/i)
  if (tmdbTvMatch) {
    tmdb_id = parseInt(tmdbTvMatch[1], 10)
    if (season === null) season = parseInt(tmdbTvMatch[2], 10)
    if (episode === null) episode = parseInt(tmdbTvMatch[3], 10)
  } else {
    const watchMatch = url.match(/\/watch\/(\d+)(?:\/(\d+))?(?:\/(\d+))?/i)
    if (watchMatch) {
      tmdb_id = parseInt(watchMatch[1], 10)
      if (watchMatch[2] && season === null) season = parseInt(watchMatch[2], 10)
      if (watchMatch[3] && episode === null)
        episode = parseInt(watchMatch[3], 10)
    }
  }

  if (!tmdb_id) {
    // Pattern: /media/tmdb-{type}-{id}-{slug}/{seasonId}/{episodeId}
    // e.g. /media/tmdb-tv-124364-from/192632/2910462
    // The season/episode values are TMDB season/episode IDs which the
    // background script can resolve to actual numbers.
    const mediaTvMatch = url.match(
      /\/media\/tmdb-(tv|movie)-(\d+)-([^/]+)\/(\d+)\/(\d+)/i
    )
    if (mediaTvMatch) {
      tmdb_id = parseInt(mediaTvMatch[2], 10)
      // The season and episode values in this pattern are TMDB
      // season/episode IDs (e.g. 192632 / 2910462), not actual
      // sequential numbers.  Store the episode_id so the background
      // script can resolve it via the TMDB API to get the real
      // season_number and episode_number (e.g. 1 / 1).
      episode_id = parseInt(mediaTvMatch[5], 10)
      // Set type hint from the URL itself
      if (mediaTvMatch[1].toLowerCase() === "tv") typeHint = "tv"
      else if (mediaTvMatch[1].toLowerCase() === "movie") typeHint = "movie"
      // Note: slug is NOT used as title here — it's added as a fallback
      // in the title extraction section (F) below, so that better sources
      // like og:title and h1 are tried first.
    }

    const genericMatch = url.match(/\/(tv|movie)\/(\d+)/i)
    const tmdbUrlMatch = url.match(/tmdb[/-](\d+)/i)
    const idMatch = genericMatch || tmdbUrlMatch
    if (idMatch) {
      tmdb_id = parseInt(idMatch[idMatch.length - 1], 10)
    }
  }

  // IMDb ID from URL
  if (!tmdb_id) {
    const decodedUrl = decodeURIComponent(url)
    const imdbMatch = decodedUrl.match(/\/(tt\d+)/i)
    if (imdbMatch) {
      imdb_id = imdbMatch[1]
    }
    const seriesMatch = decodedUrl.match(/\/(tt\d+):(\d+):(\d+)/i)
    if (seriesMatch) {
      imdb_id = seriesMatch[1]
      if (season === null) season = parseInt(seriesMatch[2], 10)
      if (episode === null) episode = parseInt(seriesMatch[3], 10)
    }
  }

  // --------------------------------------------------------------------------
  // C. Extract season/episode from body text if still not found
  // --------------------------------------------------------------------------
  if (season === null || episode === null) {
    const { season: s, episode: e } = parseSeasonEpisodeFromBody(bodyText)
    if (season === null) season = s
    if (episode === null) episode = e
  }

  // --------------------------------------------------------------------------
  // D. Determine media type
  // --------------------------------------------------------------------------
  // JSON-LD type is the most reliable signal
  const jsonLdType = jsonLd ? extractMediaTypeFromJsonLd(jsonLd) : null

  // Check body text for TV/movie indicators
  const bodyHasTvIndicators = /\b(season|episode|series)\b/i.test(bodyText)
  const bodyHasMovieIndicators = /\b(movie|film)\b/i.test(bodyText)

  const isTV =
    typeHint === "tv" ||
    jsonLdType === "tv" ||
    (typeHint !== "movie" &&
      jsonLdType !== "movie" &&
      (season !== null ||
        episode !== null ||
        /\/tv\//i.test(url) ||
        /tmdb-tv-\d+/i.test(url) ||
        (bodyHasTvIndicators && !bodyHasMovieIndicators)))
  const type: "tv" | "movie" = isTV ? "tv" : "movie"

  // --------------------------------------------------------------------------
  // E. Extract year
  // --------------------------------------------------------------------------
  if (!extractedYear) {
    const urlYearMatch =
      url.match(/-(19|20)\d{2}-/) || url.match(/-(19|20)\d{2}$/)
    const yearMatch =
      urlYearMatch ||
      documentTitle.match(/\((19|20)\d{2}\)/) ||
      bodyText.match(/\b(19|20)\d{2}\b/)
    extractedYear = yearMatch ? yearMatch[0].replace(/[-()]/g, "") : undefined
  }

  // --------------------------------------------------------------------------
  // F. Extract title (chain of fallbacks)
  // --------------------------------------------------------------------------
  let titleFromUrl = false

  if (!title) {
    // 1. Try og:title / twitter:title meta tags (used by many sites)
    title = extractMetaTitle()
  }

  if (!title) {
    // 2. Try URL path patterns
    try {
      const path = new URL(url).pathname

      let match = path.match(
        /\/(?:movie|movies|tv)\/(.+?)(?:-(?:19|20)\d{2})?(?:-[a-z0-9]+)?$/i
      )
      if (!match) {
        match = path.match(
          /\/watch\/(.+?)(?:-(?:19|20)\d{2})?(?:-[a-z0-9]+)?$/i
        )
      }
      if (!match) {
        match = path.match(
          /\/(?:film|show|video)\/(.+?)(?:-(?:19|20)\d{2})?(?:-[a-z0-9]+)?$/i
        )
      }
      // Pattern 4: /play/{id}/{slug} or /embed/{id}/{slug}
      if (!match) {
        match = path.match(
          /\/(?:play|embed|episode)\/(?:[^/]+\/)?(.+?)(?:-(?:19|20)\d{2})?$/i
        )
      }

      if (match && match[1]) {
        title = match[1].replace(/-/g, " ")
        title = title.replace(
          /\s+(full\s+movie|watch\s+online|stream\s+free)$/i,
          ""
        )
        titleFromUrl = true
      }
    } catch {
      // ignore
    }
  }

  if (!title) {
    // 3. Try slug from /media/tmdb-{type}-{id}-{slug} URL pattern
    const mediaSlug = url.match(/\/media\/tmdb-(?:tv|movie)-\d+-([^/]+)\//i)
    if (mediaSlug) {
      title = mediaSlug[1].replace(/[-_]/g, " ")
      titleFromUrl = true
    }
  }

  if (!title) {
    // 4. Try the first visible heading on the page (h1)
    const h1 = document.querySelector("h1")?.textContent?.trim()
    if (h1 && h1.length > 1 && h1.length < 200) {
      title = h1
    }
  }

  if (!title) {
    // 4. Try first line of body text
    const firstLine = getFirstBodyLine(bodyText)
    if (firstLine && !/^(loading|error|redirect)/i.test(firstLine)) {
      title = firstLine
    }
  }

  if (!title) {
    // 5. Fall back to cleaned document.title
    let domain = ""
    try {
      domain = new URL(url).hostname.replace(/^www\./, "")
    } catch {
      // ignore
    }
    title = cleanDocumentTitle(documentTitle, domain)
  }

  // Validate non-URL titles
  if (!titleFromUrl && title) {
    const invalidTitles = [
      "page not found",
      "404",
      "error",
      "loading...",
      "redirecting...",
      "untitled"
    ]
    if (
      invalidTitles.some((invalid) => title!.toLowerCase().includes(invalid))
    ) {
      title = undefined
    }
  }

  // --------------------------------------------------------------------------
  // G. Return
  // --------------------------------------------------------------------------
  return {
    title: title || "Untitled",
    tmdb_id,
    imdb_id,
    type,
    // Pass null for season/episode when unknown — the API handles resolution
    season: season ?? null,
    episode: episode ?? null,
    episode_id,
    currentTime,
    year: extractedYear
  }
}
