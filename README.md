<img align="right" width="184" src="https://raw.githubusercontent.com/TheIntroDB/theintrodb-assets/main/integrations/chrome-firefox.png" alt="Chrome and Firefox">

[![Chrome & Firefox MV3](https://img.shields.io/badge/Chrome%20%26%20Firefox-MV3-4285F4?style=flat-square&logo=googlechrome&logoColor=4ade80&labelColor=0d0d0d)](https://theintrodb.org)
[![License](https://img.shields.io/github/license/TheIntroDB/universal-extension?style=flat-square&logo=gnu&logoColor=4ade80&label=License&labelColor=0d0d0d&color=038939)](https://github.com/TheIntroDB/universal-extension/blob/main/LICENSE)

[![Stars](https://img.shields.io/github/stars/TheIntroDB/universal-extension?style=flat-square&logo=github&logoColor=4ade80&label=Stars&labelColor=0d0d0d&color=038939)](https://github.com/TheIntroDB/universal-extension/stargazers)
[![Issues](https://img.shields.io/github/issues/TheIntroDB/universal-extension?style=flat-square&logo=github&logoColor=4ade80&label=Issues&labelColor=0d0d0d&color=038939)](https://github.com/TheIntroDB/universal-extension/issues)
[![Last commit](https://img.shields.io/github/last-commit/TheIntroDB/universal-extension?style=flat-square&logo=git&logoColor=4ade80&label=Last%20commit&labelColor=0d0d0d&color=038939)](https://github.com/TheIntroDB/universal-extension/commits)
[![Discord](https://img.shields.io/discord/1457550295742812307?style=flat-square&logo=discord&logoColor=4ade80&label=Discord&labelColor=0d0d0d&color=038939)](https://discord.com/channels/1457550295742812307/1457550298255200380)

### TheIntroDB – Universal Extension

---

A browser extension that adds skip buttons for **intros**, **recaps**, **credits**, and **previews** on almost any site!

It uses [TheIntroDB](https://theintrodb.org) to know when to show skip buttons. After install you’re ready to go: open a supported (or generic) streaming page and the extension will try to show skip buttons when timestamps exist. Optionally, set your [TheIntroDB API key](https://theintrodb.org/docs) in the popup to **submit** timestamps right from the extension and to see your pending submissions.

---

## Supported sites

These sites have dedicated extractors for the best experience:

- **Netflix**
- **HBO Max / Max**
- **HDrezka**
- **Apple TV+**
- **Paramount+**
- **Peacock**
- **Plex**
- **Prime Video**

**Plus any site** where the page has a TMDB ID in the URL (e.g. `/tv/12345/1/3`, `tmdb-tv-12345`, `/watch/12345`, `tmdb/12345`) or where the media title is visible. For those, the extension uses a **generic extractor** that parses the URL and page (e.g. `S01E03`, `1x03`, season/episode in path) to detect show, season, and episode. So many other streaming sites work without a custom extractor.

---

## Installation

- [Chrome](https://chromewebstore.google.com/detail/theintrodb/goehnlbabpghpkbnlagolifeahameemn)
- [Firefox](https://addons.mozilla.org/en-US/firefox/addon/theintrodb/)
- [Manual Installation](https://github.com/TheIntroDB/universal-extension/releases)

---

## Development

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Build**

   ```bash
   npm run build
   ```

3. **Load in the browser**

   - Open `chrome://extensions` (or Firefox add-ons).
   - Enable **Developer mode** → **Load unpacked**.
   - Select the `build/chrome-mv3-dev` folder (or the path shown by `npm run dev`).

**Commands**

- `npm run dev` – watch and reload.
- `npm run build` – production build.
- `npm run package` – zip for store submission.

**Popup debug mode**

- The popup includes a hidden debug log for message and player-detection troubleshooting.
- Double-click the version number in the popup footer to toggle the debug log on or off.
- The debug log is hidden by default and only appears inside the popup UI when enabled.

**Environment (optional)**  
Copy `.env.example` to `.env` to set `PLASMO_PUBLIC_TMDB_TOKEN` (for title → TMDB ID lookup) and/or `PLASMO_PUBLIC_INTRODB_API` (default: `https://api.theintrodb.org/v4`). Only `PLASMO_PUBLIC_*` variables are injected.

---

## Contributing: adding a new site

Site logic lives in `src/websites/`. Each supported site can have its own file that exports:

1. **`match`** – when to use this extractor:

   - A **RegExp** tested against the page URL, or
   - A **function** `(url: string) => boolean`.

2. **`extract`** – how to get media context:
   - Signature: `(url, documentTitle, bodyText, currentTime?) => MediaContext`
   - Return type `MediaContext`:
     - `title: string` – display name (e.g. from document title).
     - `tmdb_id: number | null` – TMDB movie or show ID if known from URL/page.
     - `type: "tv" | "movie"`.
     - `season: number | null`, `episode: number | null` – for TV.
     - `episode_id: number | null` – optional TMDB episode ID if you have it.
     - `currentTime: number` – pass through from the player.

**Regex structure**

- **URL match:** Use a strict URL regex so only your site is matched, e.g.  
  `const MY_SITE_URL = /^https?:\/\/(www\.)?mysite\.com\//i`
- **Season/episode from URL:** e.g. `/\/season\/(\d+)\/episode\/(\d+)/i` or `/\/s(\d+)e(\d+)/i`.
- **Season/episode from page text:** Reuse patterns from existing extractors, e.g.  
  `bodyText.match(/S(\d+)\s*[E:]\s*E?(\d+)/i)` or `bodyText.match(/(\d+)x(\d+)/i)`.

**Steps**

1. Add a new file in `src/websites/`, e.g. `MySite.ts`.
2. Implement `matchMySite` (and optionally a RegExp constant) and `extractMySite` returning `MediaContext` (see `src/websites/types.ts`).
3. In `src/websites/index.ts`, import your `match` and `extract` and add `{ match: matchMySite, extract: extractMySite }` to the `SITE_EXTRACTORS` array.

If the site’s URL or page already exposes a TMDB ID (or a clear title), the **generic extractor** in `generic.ts` may already handle it; add a dedicated extractor when you need site-specific URL or DOM parsing.

---

## License

See [LICENSE](LICENSE).

---

<p align="center">
  <a href="https://theintrodb.org"><img src="https://raw.githubusercontent.com/TheIntroDB/theintrodb-assets/main/badge.png" alt="TheIntroDB" width="44" height="44"></a>
  <br><br>
  <sub><b>TheIntroDB</b> · community-submitted intro, recap, credits and preview timestamps for your media server<br>
  <a href="https://theintrodb.org">theintrodb.org</a> · <a href="https://github.com/TheIntroDB">GitHub</a> · <a href="https://discord.com/channels/1457550295742812307/1457550298255200380">Discord</a></sub>
</p>
