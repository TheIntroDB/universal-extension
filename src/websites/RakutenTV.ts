// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 TheIntroDB

import type { MediaContext } from "./types"
import {
  extractMetaTitle,
  getFirstBodyLine,
  parseSeasonEpisodeFromBody
} from "./utils"

const RAKUTEN_TV_PLAYER_URL =
  /^https?:\/\/(www\.)?rakuten\.tv\/[a-z]{2}\/player\/(movies|series)\/stream\/[a-z0-9-]+/i

export function matchRakutenTVPlayer(url: string): boolean {
  return RAKUTEN_TV_PLAYER_URL.test(url)
}

function cleanRakutenTitle(raw: string): string {
  return raw.replace(/\s*[-|~]\s*Rakuten TV.*$/i, "").trim()
}

export function extractRakutenTVPlayer(
  url: string,
  documentTitle: string,
  bodyText: string,
  currentTime = 0
): MediaContext {
  let title = extractMetaTitle() || documentTitle || ""

  const lower = title.toLowerCase()
  if (!title || lower.includes("rakuten")) {
    const domMatch = getFirstBodyLine(bodyText)
    if (domMatch) title = domMatch
  }

  title = cleanRakutenTitle(title)

  const { season, episode } = parseSeasonEpisodeFromBody(bodyText)
  const isTV = Boolean(season || episode)

  return {
    title: title || "Rakuten TV",
    tmdb_id: null,
    type: isTV ? "tv" : "movie",
    season: isTV ? season : null,
    episode: isTV ? episode : null,
    episode_id: null,
    currentTime
  }
}
