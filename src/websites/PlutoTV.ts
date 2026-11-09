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

const PLUTO_URL = /^https?:\/\/(www\.)?pluto\.tv\//i

export function matchPlutoTV(url: string): boolean {
  return PLUTO_URL.test(url)
}

function cleanTitle(title: string): string {
  return title
    .replace(/\s*[-|–]\s*Pluto\s*TV$/i, "")
    .replace(/\s*[-|–]\s*(Watch|Stream)\s+(Free|Online)\s*$/i, "")
    .replace(/\s*[-|–]\s*Free\s+(TV|Movies?|Streaming)\s*$/i, "")
    .trim()
}

export async function extractPlutoTV(
  url: string,
  documentTitle: string,
  bodyText: string,
  currentTime = 0
): Promise<MediaContext> {
  let title: string | undefined
  let season: number | null = null
  let episode: number | null = null

  const pathname = new URL(url, "https://pluto.tv").pathname

  // Determine type from URL path
  const isOnDemandSeries = /\/on-demand\/series\//i.test(pathname)

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

  const isTV = isOnDemandSeries || season !== null || episode !== null

  return {
    title: title || "Pluto TV",
    tmdb_id: null,
    type: isTV ? "tv" : "movie",
    season: isTV ? season : null,
    episode: isTV ? episode : null,
    episode_id: null,
    currentTime
  }
}
