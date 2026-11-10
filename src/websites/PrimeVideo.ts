// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 TheIntroDB

import type { MediaContext } from "./types"
import { parseSeasonEpisodeFromBody } from "./utils"

const PRIME_VIDEO_URL =
  /^https?:\/\/(www\.)?(primevideo\.com|amazon\.com\/.*\/gp\/video)\//i

function cleanTitle(title: string): string {
  return title
    .replace(/\s*[-|]\s*Amazon Prime.*$/i, "")
    .replace(/\s*[-|]\s*Prime Video$/i, "")
    .split(/[-|–|—]/)[0]
    .trim()
}

export function matchPrimeVideo(url: string): boolean {
  return PRIME_VIDEO_URL.test(url)
}

export async function extractPrimeVideo(
  url: string,
  documentTitle: string,
  bodyText: string,
  currentTime = 0
): Promise<MediaContext> {
  const title = cleanTitle(documentTitle)
  const pathname = new URL(url, "https://primevideo.com").pathname
  const { season, episode } = parseSeasonEpisodeFromBody(bodyText)

  const isTV = pathname.includes("/tv/") || season != null || episode != null
  const isMovie = pathname.includes("/movie/")

  return {
    title: title || "Prime Video",
    tmdb_id: null,
    type: isMovie ? "movie" : isTV ? "tv" : "movie",
    season: isTV ? season : null,
    episode: isTV ? episode : null,
    episode_id: null,
    currentTime
  }
}
