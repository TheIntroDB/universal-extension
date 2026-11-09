// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 TheIntroDB

import type { MediaContext } from "./types"
import { getFirstBodyLine, parseSeasonEpisodeFromBody } from "./utils"

const PLEX_URL = /^https?:\/\/(app\.)?plex\.tv\//i

function getMetaContent(selector: string): string {
  return document.querySelector(selector)?.getAttribute("content")?.trim() || ""
}

function extractYear(
  ...values: Array<string | null | undefined>
): string | undefined {
  for (const value of values) {
    if (!value) continue
    const match = value.match(/\b(19|20)\d{2}\b/)
    if (match) return match[0]
  }
  return undefined
}

function cleanTitle(title: string): string {
  return title
    .replace(/\s*[-|~]\s*Plex.*$/i, "")
    .replace(/^Watch\s+/i, "")
    .replace(/\s+\((19|20)\d{2}\)\s*$/i, "")
    .split(/[-|–|—]/)[0]
    .trim()
}

function extractTitle(documentTitle: string, bodyText: string): string {
  const og = getMetaContent('meta[property="og:title"]')
  const tw = getMetaContent('meta[name="twitter:title"]')
  const heading =
    document.querySelector("h1")?.textContent?.trim() ||
    document
      .querySelector("[data-testid='metadata-title']")
      ?.textContent?.trim() ||
    ""

  let title = og || tw || heading || documentTitle || ""

  if (!title || /\bplex\b/i.test(title)) {
    const domMatch = getFirstBodyLine(bodyText)
    if (domMatch) title = domMatch
  }

  return cleanTitle(title)
}

function inferType(
  url: URL,
  bodyText: string,
  season: number | null,
  episode: number | null
): "tv" | "movie" {
  const haystack = `${url.href} ${bodyText}`.toLowerCase()

  if (
    season != null ||
    episode != null ||
    /\b(season|episode|series)\b/i.test(bodyText) ||
    haystack.includes("/show/") ||
    haystack.includes("/shows/") ||
    haystack.includes("metadata%2fshow") ||
    haystack.includes("provider.tv")
  ) {
    return "tv"
  }

  if (
    /\b(movie|film)\b/i.test(bodyText) ||
    haystack.includes("/movie/") ||
    haystack.includes("/movies/") ||
    haystack.includes("provider.vod")
  ) {
    return "movie"
  }

  return "movie"
}

export function matchPlex(url: string): boolean {
  return PLEX_URL.test(url)
}

export async function extractPlex(
  url: string,
  documentTitle: string,
  bodyText: string,
  currentTime = 0
): Promise<MediaContext> {
  const urlObj = new URL(url, "https://app.plex.tv")
  const title = extractTitle(documentTitle, bodyText)
  const { season, episode } = parseSeasonEpisodeFromBody(bodyText)
  const type = inferType(urlObj, bodyText, season, episode)
  const year = extractYear(
    getMetaContent('meta[property="og:title"]'),
    getMetaContent('meta[name="twitter:title"]'),
    documentTitle,
    bodyText
  )

  return {
    title: title || "Plex",
    tmdb_id: null,
    type,
    season: type === "tv" ? season : null,
    episode: type === "tv" ? episode : null,
    episode_id: null,
    currentTime,
    year
  }
}
