// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 TheIntroDB

import type { MediaContext } from "./types"
import {
  extractMetaTitle,
  getFirstBodyLine,
  parseSeasonEpisodeFromBody
} from "./utils"

const MAX_URL =
  /^https?:\/\/(www\.)?(hbomax\.com|max\.com)\/[a-z]{2}\/[a-z]{2}\/(movies|series)\//i

export function matchMax(url: string): boolean {
  return MAX_URL.test(url)
}

function cleanMaxTitle(raw: string): string {
  return raw
    .replace(/\s*[-|~]\s*HBO Max.*$/i, "")
    .replace(/\s*[-|~]\s*Max.*$/i, "")
    .trim()
}

export function extractMax(
  url: string,
  documentTitle: string,
  bodyText: string,
  currentTime = 0
): MediaContext {
  let title = extractMetaTitle() || documentTitle || ""

  const lower = title.toLowerCase()
  if (!title || lower.includes("max") || lower.includes("hbo")) {
    const domMatch = getFirstBodyLine(bodyText)
    if (domMatch) title = domMatch
  }

  title = cleanMaxTitle(title)

  const { season, episode } = parseSeasonEpisodeFromBody(bodyText)
  const isTV = Boolean(season || episode)

  return {
    title: title || "Max",
    tmdb_id: null,
    type: isTV ? "tv" : "movie",
    season: isTV ? season : null,
    episode: isTV ? episode : null,
    episode_id: null,
    currentTime
  }
}
