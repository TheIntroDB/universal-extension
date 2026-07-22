import i18n from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import { initReactI18next } from "react-i18next"

import deTranslations from "./locales/de.json"
import enTranslations from "./locales/en.json"
import esTranslations from "./locales/es.json"
import nlTranslations from "./locales/nl.json"
import plPlTranslations from "./locales/pl_pl.json"
import csCZTranslations from "./locales/cs_CZ.json"
import zhCNTranslations from "./locales/zh_CN.json"

const resources = {
  de: {
    translation: deTranslations
  },
  en: {
    translation: enTranslations
  },
  es: {
    translation: esTranslations
  },
  nl: {
    translation: nlTranslations
  },
  pl: {
    translation: plPlTranslations
  },
  pl_pl: {
    translation: plPlTranslations
  },
  cs_CZ: {
    translation: csCZTranslations
  },
  zh: {
    translation: zhCNTranslations
  },
  zh_CN: {
    translation: zhCNTranslations
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    supportedLngs: ["de", "en", "es", "nl", "pl", "pl_pl", "cs", "cs_CZ", "zh", "zh_CN"],
    nonExplicitSupportedLngs: true,
    debug: false,

    interpolation: {
      escapeValue: false
    },

    detection: {
      order: ["navigator", "htmlTag"],
      caches: []
    }
  })

export default i18n
