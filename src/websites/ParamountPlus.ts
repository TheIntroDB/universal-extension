// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 TheIntroDB

import type { MediaContext } from "./types"
import { parseSeasonEpisodeFromBody } from "./utils"

const PARAMOUNT_URL = /^https?:\/\/(www\.)?paramountplus\.com\//i

function cleanTitle(title: string): string {
  return title
    .replace(/\s*[-|]\s*Paramount\+?$/i, "")
    .split(/[-|–|—]/)[0]
    .trim()
}

export function matchParamountPlus(url: string): boolean {
  return PARAMOUNT_URL.test(url)
}

export async function extractParamountPlus(
  url: string,
  documentTitle: string,
  bodyText: string,
  currentTime = 0
): Promise<MediaContext> {
  const title = cleanTitle(documentTitle)
  const pathname = new URL(url, "https://paramountplus.com").pathname
  const isShowsVideo = /\/shows\/.+\/video\//i.test(pathname)
  const isMovies = /\/movies\//i.test(pathname)
  const { season, episode } = parseSeasonEpisodeFromBody(bodyText)

  return {
    title: title || "Paramount+",
    tmdb_id: null,
    type: isMovies ? "movie" : "tv",
    season: isShowsVideo ? season : null,
    episode: isShowsVideo ? episode : null,
    episode_id: null,
    currentTime
  }
}
