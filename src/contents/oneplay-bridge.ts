import type { PlasmoCSConfig } from "plasmo"

// ---------------------------------------------------------------------------
// Oneplay keeps everything we need (title, season, episode, content type) in
// window.__NUXT__, which is page-world state a content script cannot read from
// its isolated world. Oneplay exposes it nowhere else: there is no JSON-LD on
// content pages, og:title is the same generic string on every page, and the
// player page body text does not contain the season.
//
// This script runs in the MAIN world, reads the Pinia player store and mirrors
// a minimal snapshot onto a root data attribute, where the isolated content
// script can pick it up (see src/websites/Oneplay.ts).
// ---------------------------------------------------------------------------

export const config: PlasmoCSConfig = {
  matches: ["https://*.oneplay.cz/*", "https://*.oneplay.sk/*"],
  all_frames: false,
  run_at: "document_idle",
  world: "MAIN"
}

const BRIDGE_ATTR = "data-introdb-oneplay"
const POLL_MS = 1000

interface BridgeSnapshot {
  v: number
  href: string
  contentType: string | null
  overlayTitle: string | null
  overlaySubTitle: string | null
  contentId: string | null
  contentTitle: string | null
  contentTypeRaw: string | null
  season: string | number | null
  episodeNumber: string | number | null
  parentTitle: string | null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function readSnapshot(): BridgeSnapshot | null {
  const nuxt = asRecord((window as unknown as Record<string, unknown>).__NUXT__)
  const pinia = asRecord(nuxt?.pinia)
  const player = asRecord(pinia?.player)
  const rawData = asRecord(player?.rawData)
  const playerControl = asRecord(rawData?.playerControl)
  if (!playerControl) return null

  const overlay = asRecord(playerControl.contentOverlay)
  const meta = asRecord(playerControl.meta)
  const tracking = asRecord(playerControl.tracking)
  const contentData = asRecord(tracking?.contentData)
  const parent = asRecord(contentData?.parent)

  const season = contentData?.season
  const episodeNumber = contentData?.episodeNumber

  return {
    v: 1,
    href: location.href,
    contentType: asString(meta?.contentType),
    overlayTitle: asString(overlay?.title),
    overlaySubTitle: asString(overlay?.subTitle),
    contentId: asString(contentData?.id),
    contentTitle: asString(contentData?.title),
    contentTypeRaw: asString(contentData?.type),
    season:
      typeof season === "string" || typeof season === "number" ? season : null,
    episodeNumber:
      typeof episodeNumber === "string" || typeof episodeNumber === "number"
        ? episodeNumber
        : null,
    parentTitle: asString(parent?.title)
  }
}

function publish() {
  try {
    const root = document.documentElement
    if (!root) return

    const snapshot = readSnapshot()
    if (!snapshot) {
      root.removeAttribute(BRIDGE_ATTR)
      return
    }

    const serialised = JSON.stringify(snapshot)
    // Only touch the DOM when something actually changed — the isolated script
    // polls this attribute and the page runs its own MutationObservers.
    if (root.getAttribute(BRIDGE_ATTR) !== serialised) {
      root.setAttribute(BRIDGE_ATTR, serialised)
    }
  } catch {
    // Never let a page-state change break the host page.
  }
}

publish()
setInterval(publish, POLL_MS)
