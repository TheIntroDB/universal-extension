// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 TheIntroDB

import type { MediaContext } from "./types"
import { parseSeasonEpisodeFromBody } from "./utils"

const MAX_URL = /^https?:\/\/(www\.)?(max\.com|hbomax\.com)\//i

function cleanTitle(title: string): string {
  return title
    .replace(/\s*[-|]\s*(Max|HBO Max)$/i, "")
    .split(/[-|–|—]/)[0]
    .trim()
}

export function matchHBOMax(url: string): boolean {
  return MAX_URL.test(url)
}

export async function extractHBOMax(
  url: string,
  documentTitle: string,
  bodyText: string,
  currentTime = 0
): Promise<MediaContext> {
  const pageTitle = cleanTitle(documentTitle)
  const { season, episode } = parseSeasonEpisodeFromBody(bodyText)

  const pathParts = new URL(url, "https://max.com").pathname
    .split("/")
    .filter(Boolean)
  const section = pathParts[0]
  const isVideo = section === "video"
  const type: "tv" | "movie" = section === "movie" ? "movie" : "tv"

  return {
    title: pageTitle || "Max",
    tmdb_id: null,
    type,
    season: isVideo ? season : null,
    episode: isVideo ? episode : null,
    episode_id: null,
    currentTime
  }
}
