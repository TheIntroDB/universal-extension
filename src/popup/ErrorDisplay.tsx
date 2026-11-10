// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 TheIntroDB

export function ErrorDisplay({ message }: { message: string | null }) {
  if (!message) return null

  return (
    <div className="bg-red-500 text-white p-2.5 text-center text-xs font-bold w-full box-border absolute top-0 left-0 z-50 rounded-4xl">
      {message}
    </div>
  )
}
