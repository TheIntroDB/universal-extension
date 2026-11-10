// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 TheIntroDB

/**
 * Firefox WebExtensions use the global `browser` API (promise-based).
 * Chrome uses `chrome`. This declaration allows TypeScript to recognize `browser`.
 */
declare const browser: typeof chrome
