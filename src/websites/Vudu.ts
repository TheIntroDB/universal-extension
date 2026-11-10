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

const VUDU_URL = /^https?:\/\/(www\.)?(vudu\.com|athome\.fandango\.com)\//i

export function matchVudu(url: string): boolean {
  return VUDU_URL.test(url)
}

function cleanTitle(title: string): string {
  return title
    .replace(/\s*[-|]\s*(Vudu|Fandango\s*at\s*Home)$/i, "")
    .replace(
      /\s*[-|]\s*(Rent|Buy|Watch|Stream)\s+(or\s+)?(Buy|Rent|Watch|Stream)?\s*$/i,
      ""
    )
    .replace(/\s*[-|]\s*Fandango\s*$/i, "")
    .trim()
}

export function extractVudu(
  url: string,
  documentTitle: string,
  bodyText: string,
  currentTime = 0
): MediaContext {
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

  // 3. Try body text for season/episode
  if (season === null || episode === null) {
    const se = parseSeasonEpisodeFromBody(bodyText)
    if (season === null) season = se.season
    if (episode === null) episode = se.episode
  }

  // 4. Clean document title as last resort
  if (!title) {
    title = cleanTitle(documentTitle)
  }

  const isTV = season !== null || episode !== null

  return {
    title: title || "Vudu",
    tmdb_id: null,
    type: isTV ? "tv" : "movie",
    season: isTV ? season : null,
    episode: isTV ? episode : null,
    episode_id: null,
    currentTime
  }
}
