# Tim's Music Blog

A responsive record-shop browser for the music blog’s album archive.

## Local development

```bash
cp .env.example .env
pnpm install
pnpm dev
```

Open `http://localhost:3000/`.

## Docker

```bash
cp .env.example .env
cp compose.example.yaml compose.yaml
# Add the WordPress URL and credentials to .env.
docker compose up --build -d
```

Open `http://localhost:3000/`; set `MUSICBLOG_PORT` in `.env` to use another
host port. The WordPress server must be reachable while the image builds. Its
origin is included in the image-optimization configuration, so rebuild the image
when that origin changes. Compose supplies `.env` as a BuildKit secret, keeping
WordPress credentials out of image layers.

## Catalog behavior

The catalog uses three groups on phones, five at
medium widths, and seven on desktop. Desktop lanes and their vertical geometry
scale with the viewport so 1080p and 4K displays keep the same composition. Its
light palette follows the quiet listening-index style;
its dark palette uses the warm record-shop treatment. The initial mode follows
the operating system and can be changed with the theme switch.

The centered search bar queries a server-local catalog index after two
characters and a 280ms pause. Keyword matching is typo-tolerant across titles
plus every embedded artist and genre taxonomy. Its filter button opens a
responsive panel for multi-artist, multi-genre, release type, unreleased-at-
listen, explicit-content, rating, release-date, and listened-date criteria.
Filters work without keywords; artist and genre options filter instantly in the
browser from a lightweight facet list while album matching remains server-only.
Date and rating controls are bounded by values that actually exist in the
catalog. No search or filter makes a query-time WordPress request.

Browser requests remain abortable and latest-query-wins; current results remain
visible while replacements load. Results retain the same finite three, five, or
seven lane browser and progressively request later pages near a lane boundary.
Clearing search and filters restores the archive at its exact prior scroll
positions. Search reconciliation animates only a pixel-bounded set of focal
sleeves, cancels cleanly on interruption or resize, and switches immediately for
broad result sets, reduced motion, or very large rendering surfaces.

With a mouse, hover a record’s exposed resting edge to preview it and click to
open its review without leaving the catalog. Outer-lane previews move slightly
toward the center so their sleeve and label remain fully visible. The preview
label fades while the sleeve flies into a flat presentation beside a vertically centered,
content-sized review panel. Moving a mouse or pen over the detail sleeve tilts
it in 3D. On touch screens, tap once to preview and prefetch, then tap the same
sleeve again to open its review; dragging directly on the detail sleeve tilts it
without scrolling, while supported phones can also tilt it from device
orientation. iOS requests motion access from that opening tap, and sensor motion
requires HTTPS. Denied and unsupported clients retain touch dragging, while
reduced-motion clients remain flat. At
compact widths the sleeve
centers above an equally wide review panel, and the overlay scrolls as one
continuous page. Crossing the compact breakpoint while details are open fades
smoothly between arrangements while the catalog keeps its responsive three,
five, or seven lanes. Click or tap empty backdrop space, or press Escape, to
return the sleeve to its row; catalog interaction resumes as soon as dismissal
starts. Starting another catalog scroll dismisses a preview. Reaching the last
album in every lane reveals the end-of-catalog message. WordPress access is
server-only and read-only.

The first 100 albums and WordPress's authoritative total are cached for one
hour and render without waiting for the rest of the archive. Server startup then
warms all remaining 100-post pages, including their ACF data and embedded
artist/genre terms, with three requests at a time. Raw metadata remains
server-only; the browser still receives lightweight album records. Every lane
reserves its finite length from the total, so readers can keep scrolling through
placeholders while warmup finishes. WordPress's original artwork passes through
responsive Next Image optimization, and an immediate vinyl shell reserves the
layout while the initial data hydrates.
Review bodies and track lists use the cached `/api/albums/[id]` endpoint. A
300ms desktop hover or the first touch selection starts prefetching, while a
compact loading status remains available when activation wins that race.
Allowed editorial HTML is sanitized on the server.

Five responsive detail layouts are temporarily available in development. Open
an album, then use the floating arrows, the keyboard’s left/right arrows, or share
`?detail=A` through `?detail=E`. The switcher is omitted from production builds.
