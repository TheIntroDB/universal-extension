// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 TheIntroDB

import type { MediaContext } from "./types"
import {
  extractMetaTitle,
  getFirstBodyLine,
  parseSeasonEpisodeFromBody
} from "./utils"

const SKYSHOWTIME_URL =
  /^https?:\/\/(www\.)?skyshowtime\.com\/[a-z]{2}\/(stream|watch)\/(tv|movie)\/[a-z0-9-]+/i

export function matchSkyShowtime(url: string): boolean {
  return SKYSHOWTIME_URL.test(url)
}

function cleanSkyShowtimeTitle(raw: string): string {
  return raw.replace(/\s*[-|~]\s*SkyShowtime.*$/i, "").trim()
}

export function extractSkyShowtime(
  url: string,
  documentTitle: string,
  bodyText: string,
  currentTime = 0
): MediaContext {
  let title = extractMetaTitle() || documentTitle || ""

  const lower = title.toLowerCase()
  if (!title || lower.includes("skyshowtime")) {
    const domMatch = getFirstBodyLine(bodyText)
    if (domMatch) title = domMatch
  }

  title = cleanSkyShowtimeTitle(title)

  const { season, episode } = parseSeasonEpisodeFromBody(bodyText)
  const isTV = Boolean(season || episode)

  return {
    title: title || "SkyShowtime",
    tmdb_id: null,
    type: isTV ? "tv" : "movie",
    season: isTV ? season : null,
    episode: isTV ? episode : null,
    episode_id: null,
    currentTime
  }
}
