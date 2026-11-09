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

const TUBI_URL = /^https?:\/\/(www\.)?tubitv\.com\//i

export function matchTubi(url: string): boolean {
  return TUBI_URL.test(url)
}

function cleanTitle(title: string): string {
  return title
    .replace(/\s*[-|]\s*Tubi$/i, "")
    .replace(/\s*[-|]\s*Watch\s+(Free|Online)\s*$/i, "")
    .replace(/\s*[-|]\s*Tubi\s*(TV|Series|Movies?)$/i, "")
    .replace(/^Watch\s+/i, "")
    .trim()
}

export async function extractTubi(
  url: string,
  documentTitle: string,
  bodyText: string,
  currentTime = 0
): Promise<MediaContext> {
  let title: string | undefined
  let season: number | null = null
  let episode: number | null = null
  let year: string | undefined

  const pathname = new URL(url, "https://tubitv.com").pathname

  // Determine type from URL path
  const isSeriesPage = /\/series\//i.test(pathname)
  const isTvShowsPage = /\/tv-shows\//i.test(pathname)
  // 1. Try JSON-LD (Tubi uses Movie and TVEpisode schemas)
  const jsonLd = extractJsonLd()
  if (jsonLd) {
    const jsonTitle = extractTitleFromJsonLd(jsonLd)
    if (jsonTitle) title = jsonTitle

    const se = extractSeasonEpisodeFromJsonLd(jsonLd)
    if (se.season !== null) season = se.season
    if (se.episode !== null) episode = se.episode

    const datePublished = jsonLd.datePublished as string | undefined
    if (datePublished) {
      const yMatch = datePublished.match(/\b(19|20)\d{2}\b/)
      if (yMatch) year = yMatch[0]
    }
  }

  // 2. Try meta tags
  if (!title) {
    title = extractMetaTitle()
  }

  // 3. Extract season/episode from URL (e.g., /tv-shows/123/s01-e02-slug)
  if (season === null || episode === null) {
    const seMatch = pathname.match(/[sS](\d+)[-_.\s]?[eE](\d+)/)
    if (seMatch) {
      if (season === null) season = parseInt(seMatch[1], 10)
      if (episode === null) episode = parseInt(seMatch[2], 10)
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

  const isTV =
    isSeriesPage || isTvShowsPage || season !== null || episode !== null

  return {
    title: title || "Tubi",
    tmdb_id: null,
    type: isTV ? "tv" : "movie",
    season: isTV ? season : null,
    episode: isTV ? episode : null,
    episode_id: null,
    currentTime,
    year
  }
}
