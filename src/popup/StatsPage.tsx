// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 TheIntroDB

import React, { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import {
  TRACKED_SEGMENT_TYPES,
  type TrackableSegmentType
} from "~/shared/media"

import { api, API_URL } from "./api"

type SegmentTotals = Record<TrackableSegmentType, number>
type StatsPageProps = Record<string, never>

interface UserSubmissionsState {
  total: number
  accepted: number
  pending: number
  rejected: number
  acceptance_rate: number
  current_streak: number
  best_streak: number
}

interface LocalSkipStats {
  segments_skipped?: Partial<SegmentTotals>
  time_saved_by_type_ms?: Partial<SegmentTotals>
}

interface StatsState {
  local_time_saved_ms: number
  account_time_saved_ms: number
  segments_skipped: SegmentTotals
  time_saved_by_type_ms: SegmentTotals
  total_submissions: number
  userSubmissions?: UserSubmissionsState
}

const createEmptySegmentTotals = (): SegmentTotals => ({
  intro: 0,
  recap: 0,
  credits: 0
})

const mergeSegmentTotals = (
  values?: Partial<SegmentTotals>
): SegmentTotals => ({
  ...createEmptySegmentTotals(),
  ...values
})

const getTotalSavedTime = (values: Partial<SegmentTotals> | undefined) =>
  TRACKED_SEGMENT_TYPES.reduce(
    (total, type) => total + Number(values?.[type] || 0),
    0
  )

const normalizeUserSubmissions = (
  data: Record<string, unknown>
): UserSubmissionsState | undefined => {
  if (typeof data.total !== "number" && typeof data.accepted !== "number") {
    return undefined
  }

  return {
    total: Number(data.total) || 0,
    accepted: Number(data.accepted) || 0,
    pending: Number(data.pending) || 0,
    rejected: Number(data.rejected) || 0,
    acceptance_rate: Number(data.acceptance_rate) || 0,
    current_streak: Number(data.current_streak) || 0,
    best_streak: Number(data.best_streak) || 0
  }
}

const DEFAULT_STATS: StatsState = {
  local_time_saved_ms: 0,
  account_time_saved_ms: 0,
  segments_skipped: createEmptySegmentTotals(),
  time_saved_by_type_ms: createEmptySegmentTotals(),
  total_submissions: 0
}

function StatCard({
  label,
  value,
  loading
}: {
  label: string
  value: string | number
  loading?: boolean
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-[9px] font-bold text-gray-400">{label}</div>
      <div
        className={`text-lg font-bold ${loading ? "text-gray-600" : "text-white"}`}>
        {loading ? "---" : value}
      </div>
    </div>
  )
}

const StatsPage: React.FC<StatsPageProps> = () => {
  const { t } = useTranslation()
  const [stats, setStats] = useState<StatsState>(DEFAULT_STATS)
  const [loading, setLoading] = useState(true)
  const [apiKeyError, setApiKeyError] = useState<string | null>(null)

  useEffect(() => {
    const loadStats = async () => {
      try {
        let communityTotal = 0
        try {
          const res = await fetch(`${API_URL}/stats`)
          if (res.ok) {
            const data = await res.json()
            communityTotal = data.total_submissions || 0
          }
        } catch (e) {
          console.error("API Offline", e)
        }

        const storage = await api.storage.local.get([
          "skipButtonStats",
          "introdb_api_key"
        ])
        const local = storage.skipButtonStats as LocalSkipStats | undefined
        const introdb_api_key = storage.introdb_api_key as string | undefined

        const baseStats: StatsState = {
          ...DEFAULT_STATS,
          total_submissions: communityTotal
        }

        if (local) {
          baseStats.local_time_saved_ms = getTotalSavedTime(
            local.time_saved_by_type_ms
          )
          baseStats.segments_skipped = mergeSegmentTotals(
            local.segments_skipped
          )
          baseStats.time_saved_by_type_ms = mergeSegmentTotals(
            local.time_saved_by_type_ms
          )
        }

        setApiKeyError(null)
        if (introdb_api_key?.trim()) {
          try {
            const userRes = await fetch(`${API_URL}/user/stats`, {
              headers: {
                Authorization: `Bearer ${introdb_api_key.trim()}`
              }
            })
            const userData = (await userRes.json().catch(() => ({}))) as Record<
              string,
              unknown
            >

            if (!userRes.ok) {
              if (userRes.status === 401) {
                setApiKeyError(t("errors.apiKeyNotAccepted"))
              } else {
                setApiKeyError(t("errors.couldNotLoadAccountStats"))
              }
            } else {
              const tsMs = userData.total_time_saved_ms
              if (typeof tsMs === "number" && tsMs >= 0) {
                baseStats.account_time_saved_ms = tsMs
              }

              baseStats.userSubmissions = normalizeUserSubmissions(userData)
            }
          } catch (e) {
            console.error("User stats fetch failed", e)
          }
        }

        setStats(baseStats)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [t])

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const m = Math.floor((seconds % 3600) / 60)
    const h = Math.floor(seconds / 3600)
    const s = seconds % 60
    return `${h > 0 ? h + t("time.hours") + " " : ""}${m > 0 ? m + t("time.minutes") + " " : ""}${s}${t("time.seconds")}`
  }

  const totalSegmentsSkipped = Object.values(stats.segments_skipped).reduce(
    (total, value) => total + value,
    0
  )

  return (
    <div className="font-sans text-gray-200">
      <div className="flex flex-col gap-2">
        <div className="text-xs font-bold text-white">
          {t("popup.segmentsSkipped")}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <StatCard
            label={t("popup.total")}
            value={totalSegmentsSkipped}
            loading={loading}
          />
          <StatCard
            label={t("popup.personalTimeSaved")}
            value={formatDuration(stats.local_time_saved_ms)}
            loading={loading}
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {TRACKED_SEGMENT_TYPES.map((key) => (
            <StatCard
              key={key}
              label={t(`segments.${key}`)}
              value={stats.segments_skipped[key]}
              loading={loading}
            />
          ))}
        </div>
      </div>

      {stats.userSubmissions && (
        <div className="mt-4">
          <div className="mb-2 text-xs font-bold text-white">
            {t("popup.yourSubmissions")}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <StatCard
              label={t("popup.total")}
              value={stats.userSubmissions.total.toLocaleString()}
            />
            <StatCard
              label={t("popup.accepted")}
              value={stats.userSubmissions.accepted.toLocaleString()}
            />
            <StatCard
              label={t("popup.pending")}
              value={stats.userSubmissions.pending.toLocaleString()}
            />
            <StatCard
              label={t("popup.acceptanceRate")}
              value={`${stats.userSubmissions.acceptance_rate.toFixed(1)}%`}
            />
            <StatCard
              label={t("popup.currentStreak")}
              value={stats.userSubmissions.current_streak}
            />
            <StatCard
              label={t("popup.bestStreak")}
              value={stats.userSubmissions.best_streak}
            />
          </div>
        </div>
      )}

      {apiKeyError && (
        <div className="mt-3 rounded-2xl border border-red-500/40 bg-red-500/10 p-2.5 text-xs text-red-300">
          {apiKeyError}
        </div>
      )}
    </div>
  )
}

export { StatsPage }
