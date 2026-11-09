// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 TheIntroDB

import { INTRODB_API_URL } from "~/shared/config"

export const api = typeof browser !== "undefined" ? browser : chrome
export const API_URL = INTRODB_API_URL
