// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 TheIntroDB

import { useTranslation } from "react-i18next"

export const BUTTON_THEME_STORAGE_KEY = "button_theme"

export const BUTTON_THEMES = {
  green: {
    label: "Green",
    bg: "rgba(255, 255, 255, 0.05)",
    bgHover: "rgba(255, 255, 255, 0.1)",
    color: "#34D399",
    colorHover: "#ffffff",
    borderColor: "rgba(255, 255, 255, 0.1)"
  },
  blue: {
    label: "Blue",
    bg: "rgba(59, 130, 246, 0.1)",
    bgHover: "rgba(59, 130, 246, 0.2)",
    color: "#60A5FA",
    colorHover: "#ffffff",
    borderColor: "rgba(59, 130, 246, 0.3)"
  },
  purple: {
    label: "Purple",
    bg: "rgba(168, 85, 247, 0.1)",
    bgHover: "rgba(168, 85, 247, 0.2)",
    color: "#C084FC",
    colorHover: "#ffffff",
    borderColor: "rgba(168, 85, 247, 0.3)"
  },
  white: {
    label: "White",
    bg: "rgba(255, 255, 255, 0.05)",
    bgHover: "rgba(255, 255, 255, 0.15)",
    color: "#ffffff",
    colorHover: "#ffffff",
    borderColor: "rgba(255, 255, 255, 0.15)"
  },
  red: {
    label: "Red",
    bg: "rgba(239, 68, 68, 0.1)",
    bgHover: "rgba(239, 68, 68, 0.2)",
    color: "#F87171",
    colorHover: "#ffffff",
    borderColor: "rgba(239, 68, 68, 0.3)"
  },
  orange: {
    label: "Orange",
    bg: "rgba(249, 115, 22, 0.1)",
    bgHover: "rgba(249, 115, 22, 0.2)",
    color: "#FB923C",
    colorHover: "#ffffff",
    borderColor: "rgba(249, 115, 22, 0.3)"
  },
  cyan: {
    label: "Cyan",
    bg: "rgba(6, 182, 212, 0.1)",
    bgHover: "rgba(6, 182, 212, 0.2)",
    color: "#22D3EE",
    colorHover: "#ffffff",
    borderColor: "rgba(6, 182, 212, 0.3)"
  },
  pink: {
    label: "Pink",
    bg: "rgba(236, 72, 153, 0.1)",
    bgHover: "rgba(236, 72, 153, 0.2)",
    color: "#F472B6",
    colorHover: "#ffffff",
    borderColor: "rgba(236, 72, 153, 0.3)"
  }
} as const

export type ButtonTheme = keyof typeof BUTTON_THEMES

const LANGUAGES: Record<string, string> = {
  en: "English",
  de: "Deutsch",
  es: "Español",
  nl: "Nederlands",
  pl: "Polski"
}

interface SettingsPageProps {
  anonymousUsageReportingEnabled: boolean
  onAnonymousUsageReportingChange: (enabled: boolean) => void | Promise<void>
  language: string
  onLanguageChange: (lang: string) => void | Promise<void>
  buttonTheme: ButtonTheme
  onButtonThemeChange: (theme: ButtonTheme) => void | Promise<void>
  onSaveSettings: () => void | Promise<void>
  onResetDefaults: () => void | Promise<void>
}

export function SettingsPage({
  anonymousUsageReportingEnabled,
  onAnonymousUsageReportingChange,
  language,
  onLanguageChange,
  buttonTheme,
  onButtonThemeChange,
  onSaveSettings,
  onResetDefaults
}: SettingsPageProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-6 text-gray-200 font-sans">
      {/* Anonymous usage reporting */}
      <div>
        <label className="text-xs font-bold text-white mb-3 block">
          {t("popup.anonymousUsageReporting")}
        </label>
        <button
          type="button"
          role="switch"
          aria-checked={anonymousUsageReportingEnabled}
          onClick={() =>
            onAnonymousUsageReportingChange(!anonymousUsageReportingEnabled)
          }
          className={`group relative flex items-center gap-3 w-full rounded-2xl border px-3.5 py-3 text-xs transition-all cursor-pointer ${
            anonymousUsageReportingEnabled
              ? "border-green-500/30 bg-green-500/10"
              : "border-white/10 bg-black/20 hover:border-white/20"
          }`}>
          {/* Toggle track */}
          <span
            className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border transition-colors duration-200 ${
              anonymousUsageReportingEnabled
                ? "border-green-500/50 bg-green-500/30"
                : "border-white/10 bg-white/5"
            }`}>
            {/* Toggle knob */}
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200 ${
                anonymousUsageReportingEnabled
                  ? "translate-x-[18px] bg-green-400"
                  : "translate-x-[1px]"
              }`}
            />
          </span>
          {/* Label text */}
          <span className="flex-1 text-left leading-snug">
            <span
              className={`font-medium transition-colors ${
                anonymousUsageReportingEnabled
                  ? "text-green-300"
                  : "text-gray-300"
              }`}>
              {anonymousUsageReportingEnabled
                ? t("popup.enabled")
                : t("popup.disabled")}
            </span>
            <span className="block text-[11px] text-gray-500 mt-0.5">
              {t("popup.anonymousUsageReportingDescription")}
            </span>
          </span>
        </button>
      </div>

      {/* Language */}
      <div>
        <label className="text-xs font-bold text-white mb-3 block">
          {t("settings.language")}
        </label>
        <div className="relative">
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="w-full appearance-none rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5 pr-8 text-xs text-gray-200 transition-all hover:border-white/20 focus:border-green-400/50 focus:outline-none cursor-pointer">
            {Object.entries(LANGUAGES).map(([code, name]) => (
              <option
                key={code}
                value={code}
                className="bg-[#0d0d0d] text-gray-200">
                {name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-500">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
      </div>

      {/* Button theme */}
      <div>
        <label className="text-xs font-bold text-white mb-3 block">
          {t("settings.skipButtonTheme")}
        </label>
        <div className="relative">
          <select
            value={buttonTheme}
            onChange={(e) => onButtonThemeChange(e.target.value as ButtonTheme)}
            className="w-full appearance-none rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5 pr-8 text-xs text-gray-200 transition-all hover:border-white/20 focus:border-green-400/50 focus:outline-none cursor-pointer">
            {(Object.keys(BUTTON_THEMES) as ButtonTheme[]).map((key) => {
              const theme = BUTTON_THEMES[key]
              return (
                <option
                  key={key}
                  value={key}
                  className="bg-[#0d0d0d] text-gray-200">
                  {theme.label}
                </option>
              )
            })}
          </select>
          {/* Preview dot */}
          <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: BUTTON_THEMES[buttonTheme].color }}
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-500">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
        <p className="text-[11px] text-gray-500 mt-2 leading-snug">
          {t("settings.skipButtonThemeDescription")}
        </p>
      </div>

      {/* Save Settings */}
      <button
        type="button"
        onClick={onSaveSettings}
        className="w-full rounded-2xl border border-green-500/30 bg-green-500/10 px-3 py-2.5 text-xs font-medium text-green-400 transition-all hover:bg-green-500/20 hover:border-green-500/50">
        {t("settings.saveSettings")}
      </button>

      {/* Danger Zone */}
      <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.03] p-4 pb-3">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500/60" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-red-400/80">
            {t("settings.dangerZone")}
          </span>
        </div>
        <button
          type="button"
          onClick={onResetDefaults}
          className="w-full rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2.5 text-xs font-medium text-red-400 transition-all hover:bg-red-500/15 hover:border-red-500/50">
          {t("settings.resetToDefaults")}
        </button>
      </div>
    </div>
  )
}
