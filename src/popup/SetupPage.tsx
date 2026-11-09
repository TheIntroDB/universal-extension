// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 TheIntroDB

import { useTranslation } from "react-i18next"

import { Button } from "~components/ui/Button"
import { Input } from "~components/ui/Input"

interface SetupPageProps {
  apiKey: string
  onApiKeyChange: (value: string) => void
  onSaveKey: () => void | Promise<void>
}

export function SetupPage({
  apiKey,
  onApiKeyChange,
  onSaveKey
}: SetupPageProps) {
  const { t } = useTranslation()

  return (
    <div>
      <div className="flex items-center gap-4 justify-center">
        <Input
          id="api-key-input"
          type="password"
          placeholder={t("popup.enterApiKey")}
          value={apiKey}
          onChange={(event) => onApiKeyChange(event.target.value)}
          className="text-sm px-3 py-2"
        />
        <Button
          type="button"
          variant="glass"
          size="sm"
          onClick={onSaveKey}
          className="w-full text-green-400 hover:text-green-400 bg-green-400/10 border-green-400/30">
          {t("popup.authorize")}
        </Button>
      </div>
    </div>
  )
}
