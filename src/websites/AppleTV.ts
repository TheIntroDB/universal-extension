// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 TheIntroDB

import type { MediaContext } from "./types"
import { parseSeasonEpisodeFromBody } from "./utils"

const APPLE_TV_URL =
  /^https?:\/\/(tv\.apple\.com|www\.apple\.com\/apple-tv-plus)\//i

function cleanTitle(title: string): string {
  return title
    .replace(/\s*[-|]\s*Apple TV.*$/i, "")
    .split(/[-|]/)[0]
    .trim()
}

export function matchAppleTV(url: string): boolean {
  return APPLE_TV_URL.test(url)
}

export async function extractAppleTV(
  url: string,
  documentTitle: string,
  bodyText: string,
  currentTime = 0
): Promise<MediaContext> {
  const title = cleanTitle(documentTitle)
  const { season, episode } = parseSeasonEpisodeFromBody(bodyText)
  return {
    title: title || "Apple TV+",
    tmdb_id: null,
    type: season != null || episode != null ? "tv" : "movie",
    season,
    episode,
    episode_id: null,
    currentTime
  }
}
