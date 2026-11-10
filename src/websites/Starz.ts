// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 TheIntroDB

import type { MediaContext } from "./types"
import {
  extractMetaTitle,
  getFirstBodyLine,
  parseSeasonEpisodeFromBody
} from "./utils"

const STARZ_URL =
  /^https?:\/\/(www\.)?starz\.com\/[a-z]{2}\/[a-z]{2}\/(series|movies)\/[a-z0-9-]+/i

export function matchStarz(url: string): boolean {
  return STARZ_URL.test(url)
}

function cleanStarzTitle(raw: string): string {
  return raw.replace(/\s*[-|~]\s*Starz.*$/i, "").trim()
}

export function extractStarz(
  url: string,
  documentTitle: string,
  bodyText: string,
  currentTime = 0
): MediaContext {
  let title = extractMetaTitle() || documentTitle || ""

  if (!title || /starz/i.test(title)) {
    const domMatch = getFirstBodyLine(bodyText)
    if (domMatch) title = domMatch
  }

  title = cleanStarzTitle(title)

  const { season, episode } = parseSeasonEpisodeFromBody(bodyText)
  const isTV = Boolean(season || episode)

  return {
    title: title || "Starz",
    tmdb_id: null,
    type: isTV ? "tv" : "movie",
    season: isTV ? season : null,
    episode: isTV ? episode : null,
    episode_id: null,
    currentTime
  }
}
