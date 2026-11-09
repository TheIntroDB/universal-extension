// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 TheIntroDB

import type { MediaContext } from "./types"
import { parseSeasonEpisodeFromBody } from "./utils"

const NETFLIX_URL = /^https?:\/\/(www\.)?netflix\.com\//i

function cleanTitle(title: string): string {
  return title
    .replace(/[\s-]*Netflix$/i, "")
    .replace(/^Watch\s+/i, "")
    .split(/[-|\u2013\u2014]/)[0]
    .trim()
}

export function matchNetflix(url: string): boolean {
  return NETFLIX_URL.test(url)
}

export async function extractNetflix(
  url: string,
  documentTitle: string,
  bodyText: string,
  currentTime = 0
): Promise<MediaContext> {
  let netflix_id: string | null = null
  const titleMatch = url.match(/\/title\/(\d+)/)
  const jbvMatch = url.match(/\?jbv=(\d+)/)

  if (titleMatch) {
    netflix_id = titleMatch[1]
  } else if (jbvMatch) {
    netflix_id = jbvMatch[1]
  }

  const title = cleanTitle(documentTitle)
  const { season, episode } = parseSeasonEpisodeFromBody(bodyText)

  if (netflix_id) {
    const response = await chrome.runtime.sendMessage({
      action: "fetchNetflixMetadata",
      netflixId: netflix_id,
      documentTitle: documentTitle,
      season: season,
      episode: episode
    })

    if (response && response.tmdb_id) {
      return {
        title: response.title || cleanTitle(documentTitle) || "Netflix",
        tmdb_id: response.tmdb_id,
        type: response.type,
        season: response.season,
        episode: response.episode,
        episode_id: null,
        currentTime
      }
    }
  }

  const type: "tv" | "movie" =
    season != null || episode != null ? "tv" : "movie"
  const tmdb_id: number | null = null

  return {
    title: title || "Netflix",
    tmdb_id,
    type,
    season,
    episode,
    episode_id: null,
    currentTime
  }
}
