# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Music readers browsing a large personal archive of album reviews across phones,
tablets, laptops, and wide desktop displays. They want to discover a record
visually and open its existing blog post.

## Product Purpose

Turn a WordPress music blog into a tactile album catalog. Success means readers
can browse hundreds of covers quickly without the interface feeling like a
standard media grid.

## Positioning

The primary interaction borrows from flipping vinyl sleeves by hand. Three,
five, or seven responsive borderless groups reveal one dimensional cover at a
time.

## Operating Context

The catalog reads published posts and featured media from an existing WordPress
site. Mouse and touch readers open reviews in place while the catalog remains
dimmed in the background. WordPress is strictly read-only from this frontend.

## Capabilities and Constraints

- Three independently scrolling album groups on phones, five at medium widths,
  and seven on desktop displays.
- Desktop lanes fill the available width and scale their 3D geometry so 1080p
  and 4K displays retain the same composition.
- No visible containers or separators between the free-floating records.
- The focal record sits in the upper half with at most five sleeves above it;
  surrounding records collapse into depth.
- Reaching the final album in every lane reveals the floating end-of-catalog text.
- Mouse users preview from stationary exposed-sleeve hit regions, so the hover
  remains stable while the selected sleeve moves. The two outer lanes pull
  previews slightly inward to keep their sleeves and labels fully visible.
- Touch users have one global selection: tap once to preview and prefetch, tap
  that sleeve again to open its in-catalog review, or tap anywhere else to
  dismiss it.
- Starting another scroll dismisses the current preview.
- A centered typo-tolerant search starts after two characters and a short
  debounce, cancels obsolete browser requests, and applies only the latest
  response.
- A responsive filter panel supports multiple artists, genres, and release
  types; explicit or clean releases; unreleased-at-listen records; rating
  comparisons; and release/listened date ranges. Filters work with no keyword.
- Artist and genre choices search instantly from lightweight server-provided
  text facets. Date and rating controls stop at the catalog's actual bounds,
  and compact date controls remain picker-only.
- Search and filtering run against the server-local catalog index across titles,
  all artist terms, all genre terms, release taxonomy, and indexed ACF fields;
  they make no query-time WordPress request.
- On compact screens, filter opening reversibly shifts the record field below
  the controls; wide layouts keep the costly 3D field stationary. Closed filter
  controls show the number of selected constraints.
- Search results use the same finite responsive lanes, progressively load later
  result pages, and restore the archive's prior lane positions when cleared.
- Search reconciliation is interruptible and pixel-bounded: focal sleeves move,
  enter, or leave through temporary flat proxies while broad result sets,
  reduced motion, and very large rendering surfaces update immediately.
- Detail activation fades the preview label and flies the selected sleeve into
  a flat presentation. Wide screens place a content-sized review on the right;
  compact screens center an equally wide sleeve and panel vertically in one
  scrollable overlay. Mouse and pen hover tilt the detail sleeve in 3D; touch
  dragging provides the same effect without scrolling the page. Supported HTTPS
  mobile browsers additionally use device orientation after any required
  permission, while reduced-motion clients remain flat.
- Live resizing crossfades between wide and compact detail arrangements while
  the catalog independently retains its responsive three, five, or seven lanes.
- Empty backdrop space and Escape reverse the detail transition; catalog hover
  and scrolling resume immediately while the visual exit completes. Review
  content and links do not dismiss it.
- Detail shows the available release and listening dates, up to three genres,
  review body, highlighted tracks, and relevant album statistics. A missing
  rating remains visible as `NA/100`; other missing optional sections are
  omitted.
- Existing WordPress posts and featured images are the source of truth.
- An Artists/Albums control swaps the hinged catalog for a free-panning field of
  equal-size artist portraits without losing album browsing state.
- Only artist terms attached to catalog releases appear. Portraits come from the
  artist taxonomy's SCF image field, with initials retained as a missing-image
  fallback.
- Artist positions are deterministic and hex-packed. Activating one portrait
  scales it in place and calculates one bounded radial displacement for nearby
  portraits; there is no force-simulation loop.
- Artist metadata prefetches at low priority, while the field and lazy portrait
  images mount only after first use.
- Server startup caches every 100-post WordPress page with bounded concurrency
  before accepting traffic.
- Authenticated publish, update, and delete events update one catalog record at
  a time; a request-triggered full reconciliation remains as a 24-hour fallback.
- Warm catalog pages include review bodies, ACF, and embedded artist and genre
  terms, but raw metadata and the complete search index remain server-only.
- Responsive placeholder sleeves reserve the finite 3D layout while album data
  loads, and full-resolution WordPress artwork uses responsive Next Image
  optimization.
- Full review payloads are sanitized during catalog warmup and use a local detail
  endpoint without a click-time WordPress request. A 300ms desktop hover or the
  first touch selection starts loading from the application server.
- Five structurally distinct responsive detail layouts are under temporary
  development-only prototype selection.
- The hinged record-shop interaction is the selected direction.
- Light mode uses the quiet listening-index palette; dark mode uses the warm
  record-shop palette. The operating-system preference is the initial default.

## Brand Commitments

The product is a personal music blog rooted in vinyl collecting, record shops,
and older cover-flow music players. Keep the implementation minimal and let the
selected hinged interaction remain the primary album browsing model; the artist
field is a focused alternate view rather than a second catalog application.

## Evidence on Hand

- 817 WordPress posts are available through the read-only REST API.
- Posts expose album titles, artist taxonomy or tags, dates, links, and square
  featured images.
- `inspiration/` contains record-shop browsing, record-wall, and digital music
  library references.

## Product Principles

- Let album art lead.
- Browsing should feel physical without slowing discovery.
- Preserve the archive's real content and links.
- Prefer a small clear mechanism over feature accumulation.
