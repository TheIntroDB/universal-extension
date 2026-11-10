// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 TheIntroDB

import { init, trackEvent } from "@aptabase/browser"

import {
  ANALYTICS_STORAGE_KEY,
  normalizeAnalyticsEnabled,
  type AnalyticsEventProps
} from "~/shared/analytics"

const APTABASE_APP_KEY = "A-SH-7713513579"
const APTABASE_HOST = "https://analytics.theintrodb.org"

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const isValidEventProps = (value: unknown): value is AnalyticsEventProps => {
  if (!isRecord(value)) return false

  for (const propValue of Object.values(value)) {
    if (typeof propValue !== "string" && typeof propValue !== "number") {
      return false
    }
  }

  return true
}

let analyticsEnabled = true
let aptabaseReady = false

const safeTrackEvent = (name: string, props?: AnalyticsEventProps) => {
  if (!analyticsEnabled || !aptabaseReady) return

  try {
    if (props) {
      trackEvent(name, props)
    } else {
      trackEvent(name)
    }
  } catch {
    return
  }
}

export async function initAnonymousUsageReporting(): Promise<void> {
  const api = typeof browser !== "undefined" ? browser : chrome

  try {
    const storage = await api.storage.local.get([ANALYTICS_STORAGE_KEY])
    analyticsEnabled = normalizeAnalyticsEnabled(storage[ANALYTICS_STORAGE_KEY])
  } catch {
    analyticsEnabled = true
  }

  if (analyticsEnabled) {
    try {
      await init(APTABASE_APP_KEY, { host: APTABASE_HOST, isDebug: false })
      aptabaseReady = true
      safeTrackEvent("extension_start")
    } catch {
      aptabaseReady = false
    }
  }

  api.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return
    const change = changes[ANALYTICS_STORAGE_KEY]
    if (!change) return

    analyticsEnabled = normalizeAnalyticsEnabled(change.newValue)
    if (analyticsEnabled && !aptabaseReady) {
      void (async () => {
        try {
          await init(APTABASE_APP_KEY, { host: APTABASE_HOST, isDebug: false })
          aptabaseReady = true
          safeTrackEvent("extension_start")
        } catch {
          aptabaseReady = false
        }
      })()
    }
  })

  api.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (!isRecord(request) || request.action !== "analytics_track") {
      return
    }

    const name = request.name
    if (typeof name !== "string" || name.trim() === "") {
      sendResponse?.({ ok: false })
      return
    }

    const props = request.props
    safeTrackEvent(name.trim(), isValidEventProps(props) ? props : undefined)
    sendResponse?.({ ok: true })
  })
}
