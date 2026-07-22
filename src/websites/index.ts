import { extractAppleTV, matchAppleTV } from "./AppleTV"
import { extractCrunchyroll, matchCrunchyroll } from "./Crunchyroll"
import { extractDisneyPlus, matchDisneyPlus } from "./DisneyPlus"
import { extractGeneric } from "./generic"
import { extractHBOMax, matchHBOMax } from "./HBOMax"
import { extractHulu, matchHulu } from "./Hulu"
import { extractKanopy, matchKanopy } from "./Kanopy"
import { extractMax, matchMax } from "./Max"
import { extractNetflix, matchNetflix } from "./Netflix"
import { extractOneplay, matchOneplay } from "./Oneplay"
import { extractParamountPlus, matchParamountPlus } from "./ParamountPlus"
import { extractPeacock, matchPeacock } from "./Peacock"
import { extractPlex, matchPlex } from "./Plex"
import { extractPlutoTV, matchPlutoTV } from "./PlutoTV"
import { extractPrimeVideo, matchPrimeVideo } from "./PrimeVideo"
import { extractRakutenTVPlayer, matchRakutenTVPlayer } from "./RakutenTV"
import { extractSkyShowtime, matchSkyShowtime } from "./SkyShowtime"
import { extractStarz, matchStarz } from "./Starz"
import { extractTubi, matchTubi } from "./Tubi"
import type { MediaContext } from "./types"
import { extractVudu, matchVudu } from "./Vudu"

export type { MediaContext }

const SITE_EXTRACTORS: Array<{
  match: RegExp | ((url: string) => boolean)
  extract: (
    url: string,
    documentTitle: string,
    bodyText: string,
    currentTime?: number
  ) => Promise<MediaContext> | MediaContext
}> = [
  { match: matchNetflix, extract: extractNetflix },
  { match: matchOneplay, extract: extractOneplay },
  { match: matchHBOMax, extract: extractHBOMax },
  { match: matchMax, extract: extractMax },
  { match: matchAppleTV, extract: extractAppleTV },
  { match: matchDisneyPlus, extract: extractDisneyPlus },
  { match: matchHulu, extract: extractHulu },
  { match: matchParamountPlus, extract: extractParamountPlus },
  { match: matchPeacock, extract: extractPeacock },
  { match: matchPlex, extract: extractPlex },
  { match: matchPrimeVideo, extract: extractPrimeVideo },
  { match: matchRakutenTVPlayer, extract: extractRakutenTVPlayer },
  { match: matchSkyShowtime, extract: extractSkyShowtime },
  { match: matchStarz, extract: extractStarz },
  { match: matchCrunchyroll, extract: extractCrunchyroll },
  { match: matchTubi, extract: extractTubi },
  { match: matchPlutoTV, extract: extractPlutoTV },
  { match: matchKanopy, extract: extractKanopy },
  { match: matchVudu, extract: extractVudu }
]

export async function extractMediaContext(
  url: string,
  documentTitle: string,
  bodyText: string,
  currentTime = 0
): Promise<MediaContext> {
  const entry = SITE_EXTRACTORS.find((e) =>
    typeof e.match === "function" ? e.match(url) : e.match.test(url)
  )
  if (entry) {
    return entry.extract(url, documentTitle, bodyText, currentTime)
  }
  return extractGeneric(url, documentTitle, bodyText, currentTime)
}

export { extractGeneric } from "./generic"
