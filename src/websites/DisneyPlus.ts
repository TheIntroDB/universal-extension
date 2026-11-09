// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 TheIntroDB

import type { MediaContext } from "./types"
import {
  extractMetaTitle,
  getFirstBodyLine,
  parseSeasonEpisodeFromBody
} from "./utils"

function cleanDisneyTitle(raw: string): string {
  return raw
    .replace(/\s*[-|]\s*Disney\+.*$/i, "")
    .replace(/\s*–\s*Disney\+.*$/i, "")
    .trim()
}

export function matchDisneyPlus(url: string): boolean {
  return /^https?:\/\/(www\.)?disneyplus\.com\//i.test(url)
}

export function extractDisneyPlus(
  url: string,
  documentTitle: string,
  bodyText: string,
  currentTime = 0
): MediaContext {
  let title = extractMetaTitle()

  if (!title || title.toLowerCase().includes("disney+")) {
    const domMatch = getFirstBodyLine(bodyText)
    if (domMatch) title = domMatch
  }

  title = cleanDisneyTitle(title)

  const { season, episode } = parseSeasonEpisodeFromBody(bodyText)
  const isTV = Boolean(season || episode)

  return {
    title: title || "Disney+",
    tmdb_id: null,
    type: isTV ? "tv" : "movie",
    season: isTV ? season : null,
    episode: isTV ? episode : null,
    episode_id: null,
    currentTime
  }
}
