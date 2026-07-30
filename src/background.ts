import { initAnonymousUsageReporting } from "~/background/analytics"
import {
  END_OF_VIDEO_SENTINEL_MS,
  SEGMENT_TYPES,
  type Segment
} from "~/shared/media"

import { INTRODB_API_URL } from "./shared/config"

export {}

const TMDB_TOKEN = process.env.PLASMO_PUBLIC_TMDB_TOKEN
const INTRODB_USER_AGENT = "TheIntroDB Universal Extension/1.0"

void initAnonymousUsageReporting()

interface TMDBResult {
  id: number
  title?: string
  name?: string
  release_date?: string
  first_air_date?: string
}
interface IntroDBSegment {
  start_ms: number | null
  end_ms: number | null
  start?: number
  end?: number
}

interface DiscoveryResult {
  status: string
  tmdb_id?: number
  title?: string
  year?: string
  intro?: Segment[]
  recap?: Segment[]
  credits?: Segment[]
  preview?: Segment[]
  reset?: number
}

interface DiscoveryRequest {
  tmdb_id?: number
  imdb_id?: string
  title?: string
  isTV?: boolean
  season?: number
  episode?: number
  episode_id?: number
  year?: string
  duration_ms?: number
}

const tmdbHeaders = {
  Authorization: `Bearer ${TMDB_TOKEN}`,
  Accept: "application/json"
}
const cleanTitle = (t: string) =>
  t
    .toLowerCase()
    .replace(/[^\w\s]/gi, "")
    .trim()

async function handleDiscovery(
  data: DiscoveryRequest
): Promise<DiscoveryResult> {
  try {
    let tmdbId = data.tmdb_id
    let tmdbResult: TMDBResult | null = null

    if (!tmdbId && data.imdb_id) {
      const res = await fetch(
        `https://api.themoviedb.org/3/find/${data.imdb_id}?external_source=imdb_id`,
        { headers: tmdbHeaders }
      )
      if (res.ok) {
        const findData = await res.json()
        const result = findData.movie_results?.[0] || findData.tv_results?.[0]
        if (result) {
          tmdbId = result.id
          tmdbResult = result
        }
      }
    }

    if (!tmdbId && data.title && data.title.length > 2) {
      const type = data.isTV ? "tv" : "movie"
      const res = await fetch(
        // include_adult: TMDB hides adult-flagged entries by default, which
        // silently drops legitimate titles the user is actually watching
        // (e.g. "Party Shore Slovensko"). We match against a known title
        // rather than browsing, so the results stay scoped to that title.
        `https://api.themoviedb.org/3/search/${type}?include_adult=true&query=${encodeURIComponent(data.title)}`,
        { headers: tmdbHeaders }
      )

      if (res.ok) {
        const sData = await res.json()
        const results: TMDBResult[] = sData.results || []
        if (results.length > 0) {
          const targetTitle = cleanTitle(data.title)
          const match = results.find((r) => {
            const rDate = r.release_date || r.first_air_date || ""
            const rTitle = cleanTitle(r.title || r.name || "")
            return (
              (data.year ? rDate.startsWith(data.year) : true) &&
              (rTitle.includes(targetTitle) || targetTitle.includes(rTitle))
            )
          })
          tmdbResult = match || results[0]
          tmdbId = tmdbResult.id
        }
      }
    }

    if (!tmdbId) return { status: "not_found" }

    if (!tmdbResult) {
      const type = data.isTV ? "tv" : "movie"
      const res = await fetch(
        `https://api.themoviedb.org/3/${type}/${tmdbId}`,
        {
          headers: tmdbHeaders
        }
      )
      if (!res.ok) return { status: "not_found" }
      tmdbResult = await res.json()
    }

    // Resolve TMDB episode ID to season/episode numbers
    if (
      data.episode_id != null &&
      (data.season == null || data.episode == null)
    ) {
      try {
        const epRes = await fetch(
          `https://api.themoviedb.org/3/tv/episode/${data.episode_id}`,
          { headers: tmdbHeaders }
        )
        if (epRes.ok) {
          const epData = await epRes.json()
          data.season = epData.season_number
          data.episode = epData.episode_number
          if (!tmdbId && epData.show_id) {
            tmdbId = epData.show_id
          }
        }
      } catch {
        // ignore resolution errors
      }
    }

    const sNum = data.season ?? 1
    const eNum = data.episode ?? 1

    // Get the introdb_api_key from storage for authentication
    const { introdb_api_key } = await chrome.storage.local.get([
      "introdb_api_key"
    ])

    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": INTRODB_USER_AGENT,
      "X-User-Agent": INTRODB_USER_AGENT
    }
    if (introdb_api_key) {
      headers.Authorization = `Bearer ${introdb_api_key}`
    }

    const durationParam =
      typeof data.duration_ms === "number" &&
      Number.isFinite(data.duration_ms) &&
      data.duration_ms > 0
        ? `&duration_ms=${Math.round(data.duration_ms)}`
        : ""

    const introRes = await fetch(
      `${INTRODB_API_URL}/media?tmdb_id=${tmdbId}${data.isTV ? `&season=${sNum}&episode=${eNum}` : ""}${durationParam}`,
      { headers }
    )

    if (!introRes.ok) {
      if (introRes.status === 429) {
        const reset =
          introRes.headers.get("X-RateLimit-Reset") ||
          introRes.headers.get("X-UsageLimit-Reset")
        return {
          status: "rate_limited",
          reset: reset ? parseInt(reset, 10) : undefined
        }
      }
      return {
        status: "no_data",
        tmdb_id: tmdbId,
        title: tmdbResult?.title || tmdbResult?.name || data.title,
        year:
          tmdbResult?.release_date || tmdbResult?.first_air_date || data.year
      }
    }

    const introData = await introRes.json()
    const result: DiscoveryResult = {
      status: "success",
      tmdb_id: tmdbId,
      title: tmdbResult?.title || tmdbResult?.name || data.title,
      year: tmdbResult?.release_date || tmdbResult?.first_air_date || data.year
    }
    for (const key of SEGMENT_TYPES) {
      const raw = introData[key]
      if (!Array.isArray(raw)) continue
      const segments = (raw as IntroDBSegment[])
        .map((s) => {
          const start = s.start_ms ?? (s.start ? s.start * 1000 : 0)
          const end =
            s.end_ms ?? (s.end ? s.end * 1000 : END_OF_VIDEO_SENTINEL_MS)
          return { start_ms: start, end_ms: end }
        })
        .filter(
          (s) => s.end_ms > s.start_ms || s.end_ms >= END_OF_VIDEO_SENTINEL_MS
        )
      if (segments.length > 0) result[key] = segments
    }
    return result
  } catch (err) {
    console.error("handleDiscovery error:", err)
    return { status: "api_unreachable" }
  }
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === "resolveAndFetch" && request.data) {
    const { tmdb_id, imdb_id, title } = request.data as DiscoveryRequest
    if (!tmdb_id && !imdb_id && !title) {
      sendResponse({ status: "not_found", reason: "missing_ids" })
      return false
    }
    handleDiscovery(request.data).then(sendResponse)
    return true
  } else if (request.action === "fetchNetflixMetadata" && request.netflixId) {
    const { documentTitle, season, episode } = request
    const isTV = season != null || episode != null

    handleDiscovery({
      title: documentTitle,
      isTV: isTV,
      season: season,
      episode: episode
    }).then(sendResponse)
    return true
  }
})
