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

The Artists control opens `/artists`, where a draggable canvas shows every
artist attached to a catalog release. Artist metadata is
prefetched after the album interface settles, while portraits decode only when
they enter the viewport. Nodes begin in a deterministic free-floating cluster,
settle under light gravity and collision forces, then sleep. Centralized hit
testing keeps hover, focus, and tap enlargement stable without rerendering the
artist collection. Dragging pans the field, while pinch, pointer-centered wheel,
and keyboard zoom stay within readable bounds. On touch screens, one tap
previews an artist and a second tap opens `/?artist=…`; dragging or pinching
dismisses the preview. Mouse and keyboard activation open the filtered album
catalog immediately. Returning to Albums restores the existing search, filters,
and deck positions unchanged.

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

Server startup waits only for the first 100-post page, then caches the remaining
pages and original artwork in the background with bounded concurrency. The
artwork source cache is stored under `.next/cache`, while Next Image stores its
responsive derivatives alongside it. Catalog metadata is retained for 24 hours
between full reconciliations, including review bodies, WordPress's authoritative
total, ACF data, and embedded artist/genre terms. Raw metadata remains
server-only; the browser still receives lightweight album records plus a
normalized artist catalog. Numeric SCF artist image IDs are resolved through
bounded WordPress media batches on the server. Every lane reserves its finite
length from the total. After hydration, the browser quietly loads every
remaining metadata page and preloads responsive artwork three at a time, while
an immediate vinyl shell reserves the layout.
Review bodies and track lists use the server-local catalog snapshot through the
`/api/albums/[slug]` endpoint, so opening an album does not query WordPress. A
300ms desktop hover or the first touch selection starts prefetching from the
application server, while a compact loading status remains available.
Allowed editorial HTML is sanitized on the server.

### Publishing webhook

After WordPress confirms an album publish, update, or deletion, the publishing
service can update the running catalog without a full crawl:

```bash
curl -X POST http://localhost:3000/api/wordpress/webhook \
  -H "Authorization: Bearer $WORDPRESS_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"event":"published","postId":123}'
```

`published` and `updated` fetch only the specified post directly from WordPress;
`deleted` removes it without a WordPress request. The endpoint waits until the
in-memory pages, search index, totals, and filter facets are replaced atomically.
Repeated deliveries are safe. Set the same long, random
`WORDPRESS_WEBHOOK_SECRET` in this service and the caller, and call the endpoint
only after all post fields, taxonomies, and featured media have been saved. A
request after 24 hours still starts a full background reconciliation in case an
event was missed.

Five responsive detail layouts are temporarily available in development. Open
an album, then use the floating arrows, the keyboard’s left/right arrows, or share
`?detail=A` through `?detail=E`. The switcher is omitted from production builds.
