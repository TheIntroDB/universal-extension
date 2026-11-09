// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 TheIntroDB

import type { MediaContext } from "./types"
import {
  extractJsonLd,
  extractMetaTitle,
  extractSeasonEpisodeFromJsonLd,
  extractTitleFromJsonLd,
  parseSeasonEpisodeFromBody
} from "./utils"

const CRUNCHYROLL_URL = /^https?:\/\/(www\.)?crunchyroll\.com\//i

export function matchCrunchyroll(url: string): boolean {
  return CRUNCHYROLL_URL.test(url)
}

function cleanTitle(title: string): string {
  return title
    .replace(/\s*[-|–]\s*Watch\s+(on|on Crunchyroll)$/i, "")
    .replace(/\s*[-|–]\s*Crunchyroll$/i, "")
    .replace(/\s*[-|–]\s*Crunchyroll\s+(Anime|Series)$/i, "")
    .trim()
}

export async function extractCrunchyroll(
  url: string,
  documentTitle: string,
  bodyText: string,
  currentTime = 0
): Promise<MediaContext> {
  let title: string | undefined
  let season: number | null = null
  let episode: number | null = null

  // 1. Try JSON-LD
  const jsonLd = extractJsonLd()
  if (jsonLd) {
    const jsonTitle = extractTitleFromJsonLd(jsonLd)
    if (jsonTitle) title = jsonTitle

    const se = extractSeasonEpisodeFromJsonLd(jsonLd)
    if (se.season !== null) season = se.season
    if (se.episode !== null) episode = se.episode
  }

  // 2. Try meta tags
  if (!title) {
    title = extractMetaTitle()
  }

  // 3. Try URL pattern — extract episode info from slug
  //    URL: /watch/<ID>/<series-name>-episode-<N>
  if (season === null || episode === null) {
    const watchMatch = url.match(/\/watch\/([a-zA-Z0-9]+)\/(.+?)\/?$/)
    if (watchMatch) {
      const slug = watchMatch[2]
      const epMatch = slug.match(/episode[.\s-]*(\d+)/i)
      if (epMatch && episode === null) {
        episode = parseInt(epMatch[1], 10)
      }
      // Some slugs contain season info
      const sMatch = slug.match(/season[.\s-]*(\d+)/i)
      if (sMatch && season === null) {
        season = parseInt(sMatch[1], 10)
      }
    }
  }

  // 4. Try body text for season/episode
  if (season === null || episode === null) {
    const se = parseSeasonEpisodeFromBody(bodyText)
    if (season === null) season = se.season
    if (episode === null) episode = se.episode
  }

  // 5. Clean document title as last resort
  if (!title) {
    title = cleanTitle(documentTitle)
  }

  // Determine type: /series/ URL or has season/episode => tv
  const isTV =
    season !== null ||
    episode !== null ||
    /\/series\//i.test(url) ||
    /\/watch\//i.test(url)

  return {
    title: title || "Crunchyroll",
    tmdb_id: null,
    type: isTV ? "tv" : "movie",
    season: isTV ? season : null,
    episode: isTV ? episode : null,
    episode_id: null,
    currentTime
  }
}
