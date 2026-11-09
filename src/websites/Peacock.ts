// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 TheIntroDB

import type { MediaContext } from "./types"
import { parseSeasonEpisodeFromBody } from "./utils"

const PEACOCK_URL = /^https?:\/\/(www\.)?peacocktv\.com\//i

function cleanTitle(title: string): string {
  return title
    .replace(/\s*[-|]\s*Peacock$/i, "")
    .split(/[-|–|—]/)[0]
    .trim()
}

export function matchPeacock(url: string): boolean {
  return PEACOCK_URL.test(url)
}

export async function extractPeacock(
  url: string,
  documentTitle: string,
  bodyText: string,
  currentTime = 0
): Promise<MediaContext> {
  const title = cleanTitle(documentTitle)
  const pathname = new URL(url, "https://peacocktv.com").pathname
  const isPlayback =
    pathname.includes("/watch/playback") || pathname.includes("/watch/asset")
  const { season, episode } = parseSeasonEpisodeFromBody(bodyText)

  return {
    title: title || "Peacock",
    tmdb_id: null,
    type: season != null || episode != null ? "tv" : "movie",
    season: isPlayback ? season : null,
    episode: isPlayback ? episode : null,
    episode_id: null,
    currentTime
  }
}
