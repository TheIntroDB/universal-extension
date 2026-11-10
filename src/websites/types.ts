// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 TheIntroDB

import type { MediaType } from "~/shared/media"

export interface MediaContext {
  title: string
  tmdb_id: number | null
  imdb_id?: string | null
  type: MediaType
  season: number | null
  episode: number | null
  episode_id: number | null
  currentTime: number
  year?: string
}
