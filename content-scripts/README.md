# Content Scripts

This directory contains small helper modules used by the YouTube content script.

## `url-utils.js`

**Purpose**: Core YouTube URL and video ID handling utilities.

**Key functions**:

- `extractVideoId(url)` - Extracts video IDs from common YouTube URL formats.
- `constructWatchUrl(videoId)` - Creates a full YouTube watch URL from a video ID.
- `findVideoUrlFromElement(element)` - Finds a video URL from a clicked DOM element or its parents.
- `isVideoThumbnail(element)` - Detects whether an element looks like a YouTube thumbnail.

**Dependencies**: None

**Global namespace**: `window.URLUtils`

## Loading order

The scripts are loaded by `manifest.json` in this order:

1. `content-scripts/url-utils.js`
2. `content.js`

## Scope

The extension only detects YouTube video URLs for summarization. It does not automate YouTube UI actions or mark videos as watched.
