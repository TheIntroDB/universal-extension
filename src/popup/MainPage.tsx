// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 TheIntroDB

import { useTranslation } from "react-i18next"

import { SEGMENT_TYPES, type SegmentType } from "~/shared/media"
import { Button } from "~components/ui/Button"
import { Input } from "~components/ui/Input"

export type { SegmentType }

export interface MainPageProps {
  notice: string
  mediaTitle: string
  mediaMeta: string
  showDebugLogs: boolean
  debugLogs: string[]
  canSubmit: boolean
  segment: SegmentType
  setSegment: (s: SegmentType) => void
  startSec: string
  setStartSec: (v: string) => void
  endSec: string
  setEndSec: (v: string) => void
  videoDuration: string
  setVideoDuration: (v: string) => void
  onUsePlayerTimeForStart: () => void
  onUsePlayerTimeForEnd: () => void
  status: string
  statusColor: string
  onSubmit: () => void
  onDisconnect: () => void
}

export function MainPage({
  notice,
  mediaTitle,
  mediaMeta,
  showDebugLogs,
  debugLogs,
  segment,
  setSegment,
  startSec,
  setStartSec,
  endSec,
  setEndSec,
  videoDuration,
  setVideoDuration,
  onUsePlayerTimeForStart,
  onUsePlayerTimeForEnd,
  status,
  statusColor,
  onSubmit
}: MainPageProps) {
  const { t } = useTranslation()

  return (
    <>
      {notice && (
        <div className="mt-3 mb-2 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[10px] text-amber-200">
          {notice}
        </div>
      )}

      <div className="box-border text-[16px] font-medium mb-1 border-l-[3px] border-green-400 p-1 pl-2.5 bg-gradient-to-r from-green-400/10 to-transparent overflow-hidden text-ellipsis whitespace-nowrap">
        {mediaTitle}
        <p className="text-[12px]">{mediaMeta}</p>
      </div>

      {showDebugLogs && debugLogs.length > 0 && (
        <div className="mb-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
          <div className="mb-1 text-[9px] font-bold text-gray-400">
            Debug Log
          </div>
          <div className="space-y-1 font-mono text-[10px] text-gray-300">
            {debugLogs.map((log, index) => (
              <div key={`${index}-${log}`}>{log}</div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2.5 pt-4">
        <label className="text-xs font-bold text-white mb-1.5">
          {t("popup.segment")}
        </label>
        <div className="grid grid-cols-4 gap-2 mb-2">
          {SEGMENT_TYPES.map((s) => (
            <Button
              key={s}
              type="button"
              variant="glass"
              size="sm"
              data-segment={s}
              onClick={() => setSegment(s)}
              className={`text-xs flex-1 ${segment === s ? "text-green-400 bg-green-400/10 border-green-400/50 hover:text-green-400" : "text-gray-500 hover:text-gray-300"}`}>
              {t(`segments.${s}`)}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2.5 pt-4">
        <label className="text-xs font-bold text-white mb-1.5">
          {t("popup.time")}
        </label>
        <div className="flex gap-2.5 min-w-0">
          <div className="flex flex-col w-1/2 min-w-0">
            <Input
              id="start_sec"
              placeholder="00:30"
              value={startSec}
              onChange={(e) => setStartSec(e.target.value)}
            />
            <button
              type="button"
              onClick={onUsePlayerTimeForStart}
              className="mt-1 pl-1 text-[9px] text-gray-500 hover:text-green-400 transition-colors">
              {t("popup.insertCurrentTime")}
            </button>
          </div>
          <div className="flex flex-col w-1/2 min-w-0">
            <Input
              id="end_sec"
              placeholder="01:30"
              value={endSec}
              onChange={(e) => setEndSec(e.target.value)}
            />
            <button
              type="button"
              onClick={onUsePlayerTimeForEnd}
              className="mt-1 pl-1 text-[9px] text-gray-500 hover:text-green-400 transition-colors">
              {t("popup.insertCurrentTime")}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 pt-4">
        <label className="text-xs font-bold text-white mb-1.5">
          {t("popup.videoDuration")}
        </label>
        <Input
          id="video_duration"
          placeholder="2:00:00"
          value={videoDuration}
          onChange={(e) => setVideoDuration(e.target.value)}
        />
      </div>

      <button
        type="button"
        onClick={onSubmit}
        style={{
          background: "#00ff88",
          color: "#000",
          border: "none",
          padding: 14,
          width: "100%",
          cursor: "pointer",
          borderRadius: 6,
          fontWeight: 700,
          textTransform: "uppercase",
          fontSize: 11,
          letterSpacing: "1px",
          marginTop: 5
        }}>
        Accept
      </button>
      <div
        id="status"
        style={{
          fontSize: 10,
          textAlign: "center",
          marginTop: 10,
          minHeight: "1.2em",
          color: statusColor
        }}>
        {status}
      </div>
    </>
  )
}
