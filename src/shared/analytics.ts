// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 TheIntroDB

export const ANALYTICS_STORAGE_KEY = "anonymous_usage_reporting"

export type AnalyticsEventProps = Record<string, string | number>

export const getExtensionApi = () =>
  typeof browser !== "undefined" ? browser : chrome

export const normalizeAnalyticsEnabled = (value: unknown) =>
  typeof value === "boolean" ? value : true

export async function readAnonymousUsageReportingEnabled(): Promise<boolean> {
  const api = getExtensionApi()
  const storage = await api.storage.local.get([ANALYTICS_STORAGE_KEY])
  return normalizeAnalyticsEnabled(storage[ANALYTICS_STORAGE_KEY])
}

export async function writeAnonymousUsageReportingEnabled(
  enabled: boolean
): Promise<void> {
  const api = getExtensionApi()
  await api.storage.local.set({ [ANALYTICS_STORAGE_KEY]: enabled })
}

export function trackAnalyticsEvent(
  name: string,
  props?: AnalyticsEventProps
): void {
  const api = getExtensionApi()

  try {
    api.runtime.sendMessage({
      action: "analytics_track",
      name,
      props
    })
  } catch {
    return
  }
}
