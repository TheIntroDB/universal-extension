// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 TheIntroDB

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { api } from "./api"

import "~style.css"

function normalizeHostname(url: string) {
  return new URL(url).hostname.replace(/^www\./, "")
}

interface FooterProps {
  onVersionDoubleClick?: () => void
}

export function Footer({ onVersionDoubleClick }: FooterProps) {
  const { t } = useTranslation()
  const version = api.runtime.getManifest().version ?? "0.0.0"
  const [isEnabled, setIsEnabled] = useState(true)
  const [hostname, setHostname] = useState("")

  useEffect(() => {
    api.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (!tab?.url) return

      try {
        const host = normalizeHostname(tab.url)
        setHostname(host)
        api.storage.local.get(["disabled_sites"]).then(({ disabled_sites }) => {
          const disabledSites = Array.isArray(disabled_sites)
            ? disabled_sites
            : []
          setIsEnabled(!disabledSites.includes(host))
        })
      } catch {
        setHostname("")
      }
    })
  }, [])

  const handleToggle = () => {
    if (!hostname) return

    api.storage.local.get(["disabled_sites"]).then(({ disabled_sites }) => {
      const sites = Array.isArray(disabled_sites) ? disabled_sites : []
      if (sites.includes(hostname)) {
        api.storage.local.set({
          disabled_sites: sites.filter((s) => s !== hostname)
        })
        setIsEnabled(true)
      } else {
        api.storage.local.set({ disabled_sites: [...sites, hostname] })
        setIsEnabled(false)
      }
    })
  }

  return (
    <div className="flex items-center justify-between pt-2 mt-3">
      <button
        type="button"
        onDoubleClick={onVersionDoubleClick}
        className="inline-block text-xs text-gray-400 no-underline transition-colors duration-200 bg-transparent border-0 p-0 cursor-default">
        v{version}
      </button>
      <label className="flex items-center text-xs text-gray-400 gap-1">
        {isEnabled ? t("popup.enabled") : t("popup.disabled")}
        {hostname ? ` ${t("popup.on")} ${hostname}` : ""}
        <input
          type="checkbox"
          checked={isEnabled}
          onChange={handleToggle}
          disabled={!hostname}
          className="ml-1 accent-green-400"
        />
      </label>
      <a
        href="https://github.com/TheIntroDB/universal-extension"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-xs text-gray-400 no-underline transition-colors duration-200 hover:text-gray-300">
        {t("popup.github")}
      </a>
    </div>
  )
}
