# Prototype verdict

Question: which 3D scrolling mechanic makes digital album browsing feel most
like flipping physical records?

Verdict: the hinged record-shop interaction from Variant A is the selected
product direction. The alternate orbit, shuffle, push, and accordion experiments
were removed after review. Variant C's quiet light palette now complements
Variant A's warm dark palette.

## Album-detail prototype

Question: which information layout best supports reading a complete album
review while preserving the catalog and its physical sleeve transition?

Five structural options are available through `?detail=A`–`E`: editorial stack,
score rail, constellation, liner notes, and review timeline. Their review
surfaces size to available content and center vertically on wide screens. At
compact widths the sleeve and equally wide panel stack into one scrollable
page, with a short crossfade when a live resize changes arrangements. The
shared detail sleeve keeps its transition transform separate from an inner
interaction surface: mouse and pen hover tilt that surface, touch dragging
provides the same effect without scrolling, and supported HTTPS phones can also
use calibrated device orientation after any required permission. Reduced-motion
clients keep the sleeve flat. The
floating switcher is development-only and the losing layouts should be deleted
after a winner is selected.

## Catalog search

Search uses the existing responsive record field rather than a second browsing
model. Server startup first obtains the normal 100-post page, then warms the
remaining ACF-and-taxonomy catalog pages three at a time into a process-local
index backed by Next's one-hour per-page cache. The browser never receives that
raw index.

After two normalized characters and a 280ms debounce, typo-tolerant search
matches titles and all artist/genre terms, then returns lightweight 50-record
result pages. The same endpoint accepts filter-only requests with no keyword.
Filters use exact OR matching within selected artists, genres, and release types,
then AND those groups with explicit status, rounded rating comparison,
release/listened date ranges, and whether listening preceded release.

`/api/albums/filters` exposes only sorted artist/genre/release-type labels,
actual date/rating bounds, and the unreleased count. Those derived browsing
facets and filter outcomes are intentionally public; raw posts and ACF stay
server-only. Search responses carry the catalog-index version so pagination
restarts safely if an hourly index
refresh lands between pages. Only browser requests are aborted; no query-time
request reaches WordPress. The archive field remains mounted but hidden so
clearing all criteria restores every lane's prior position. Compact layouts
shift the catalog reversibly below the open filter surface; wide layouts leave
the costly 3D field stationary beneath the opaque panel.

Result changes reconcile only focal sleeves through temporary flat proxies.
The proxy set is limited by rendered pixel area, interruptions continue from
current proxy positions, resizing cancels safely, and broad result sets,
reduced-motion, or very large viewports replace results immediately. This
prevents a nominally bounded animation from becoming an expensive full-screen
compositing pass at 4K.

## Artists view

Artists are an alternate mode inside the catalog shell. The album panel
stays mounted and inert while it slides left, preserving search, filters, and
every deck position. Artist metadata prefetches through `/api/artists`; the
portrait canvas bundle mounts only on first use.

The artist endpoint uses non-empty WordPress taxonomy terms directly instead of
waiting for the complete album search index. It accepts an SCF Image Array and
supports the live site's numeric attachment IDs by resolving media in bounded
parallel batches. The normalized response is shared by the server and browser
caches; only IDs, names, slugs, image URLs, and alt text reach the browser.

The field draws deterministic ID-ordered nodes on one high-DPI-capped canvas.
A spatial grid limits collision checks while light center gravity settles the
cluster. Simulation speed ramps up quickly when awakened, decays exponentially,
and sleeps only after its motion multiplier becomes imperceptible. Dragging pans
the field, while pointer-centered wheel and keyboard zoom clamp between 55% and
180%. Portraits load four at a time only within the viewport and use a bounded
decoded-image cache. One hit-test path, an expanded active boundary, and a
pinned active node prevent hover oscillation. Reduced-motion mode renders the
settled layout without physics.

## Genres view

`/genres` shares the artist field's camera, hit testing, spatial collision grid,
and sleep behavior. It draws taxonomy names instead of portraits, assigns stable
colors from theme tokens, and maps album usage linearly to bubble area within
bounded radii. Genre usage is aggregated from the existing search documents and
travels with `/api/albums/filters`, so no extra WordPress request or data cache
is needed. Selecting a genre applies the existing exact-match album filter.
