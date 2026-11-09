// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 TheIntroDB

export function formatTime(seconds: number) {
  const totalSeconds = Math.max(0, Math.floor(seconds))
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) {
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
}

export function parseTimeToSeconds(timeStr: string) {
  const raw = timeStr.trim()
  if (!raw) return 0
  if (!raw.includes(":")) return parseFloat(raw) || 0

  const parts = raw.split(":").map((part) => part.trim())
  const numericParts = parts.map((part) => parseFloat(part))
  if (numericParts.some((value) => Number.isNaN(value))) return 0

  if (numericParts.length === 3) {
    const [h, m, s] = numericParts
    return h * 3600 + m * 60 + s
  }

  if (numericParts.length === 2) {
    const [m, s] = numericParts
    return m * 60 + s
  }

  const lastThree = numericParts.slice(-3)
  if (lastThree.length === 3) {
    const [h, m, s] = lastThree
    return h * 3600 + m * 60 + s
  }

  return 0
}

export function formatSeconds(seconds: number): string {
  if (!seconds) return "a few moments"
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `about ${hours} hour${hours > 1 ? "s" : ""}`
  } else if (minutes > 0) {
    return `about ${minutes} minute${minutes > 1 ? "s" : ""}`
  } else {
    return `${seconds} second${seconds > 1 ? "s" : ""}`
  }
}
