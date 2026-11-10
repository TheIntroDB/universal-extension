// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 TheIntroDB

import type { MediaContext } from "./types"
import {
  extractMetaTitle,
  getFirstBodyLine,
  parseSeasonEpisodeFromBody
} from "./utils"

const HULU_URL = /^https?:\/\/(www\.)?hulu\.com\/(movie|series)\/[a-z0-9-]+/i

export function matchHulu(url: string): boolean {
  return HULU_URL.test(url)
}

function cleanHuluTitle(raw: string): string {
  return raw.replace(/\s*[-|~]\s*Hulu.*$/i, "").trim()
}

export function extractHulu(
  url: string,
  documentTitle: string,
  bodyText: string,
  currentTime = 0
): MediaContext {
  let title = extractMetaTitle() || documentTitle || ""

  const lower = title.toLowerCase()
  if (!title || lower.includes("hulu")) {
    const domMatch = getFirstBodyLine(bodyText)
    if (domMatch) title = domMatch
  }

  title = cleanHuluTitle(title)

  const { season, episode } = parseSeasonEpisodeFromBody(bodyText)
  const isTV = Boolean(season || episode)

  return {
    title: title || "Hulu",
    tmdb_id: null,
    type: isTV ? "tv" : "movie",
    season: isTV ? season : null,
    episode: isTV ? episode : null,
    episode_id: null,
    currentTime
  }
}
