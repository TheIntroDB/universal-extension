// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 TheIntroDB

export const SEGMENT_TYPES = ["intro", "recap", "credits", "preview"] as const

export const TRACKED_SEGMENT_TYPES = ["intro", "recap", "credits"] as const

export const END_OF_VIDEO_SENTINEL_MS = 86400000

export type SegmentType = (typeof SEGMENT_TYPES)[number]
export type TrackableSegmentType = (typeof TRACKED_SEGMENT_TYPES)[number]
export type MediaType = "tv" | "movie"

export interface Segment {
  start_ms: number
  end_ms: number
}

export interface PlayerInfoMessage {
  available: boolean
  reason?: string
  title?: string
  tmdb_id?: number
  type?: MediaType
  season?: number
  episode?: number
  currentTime?: number
  durationMs?: number
  playerAvailable?: boolean
}
