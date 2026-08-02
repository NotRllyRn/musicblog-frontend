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
site. Desktop readers open reviews in place while the catalog remains dimmed in
the background; touch readers retain the existing external-post flow. WordPress
is strictly read-only from this frontend.

## Capabilities and Constraints

- Three independently scrolling album groups on phones, five at medium widths,
  and seven on desktop displays.
- Catalog content is capped and centered on ultrawide displays.
- No visible containers or separators between the free-floating records.
- The focal record sits in the upper half with at most five sleeves above it;
  surrounding records collapse into depth.
- Reaching the final album in every lane reveals the floating end-of-catalog text.
- Mouse users preview from stationary exposed-sleeve hit regions, so the hover
  remains stable while the selected sleeve moves.
- Touch users have one global selection: tap once to preview, tap that sleeve
  again to open, or tap anywhere else to dismiss it.
- Starting another scroll dismisses the current preview.
- Desktop activation flies the selected sleeve and its widening identity label
  into a flat left-side presentation while the review opens on the right.
- Empty backdrop space and Escape reverse the detail transition; review content
  and links do not dismiss it.
- Detail shows the available release/listening/post dates, up to three genres,
  review body, highlighted tracks, and relevant album statistics. A missing
  rating remains visible as `NA/100`; other missing optional sections are
  omitted.
- Existing WordPress posts and featured images are the source of truth.
- The first cached WordPress page supplies both initial albums and the
  authoritative total; later pages load only near a lane boundary.
- Responsive placeholder sleeves reserve the finite 3D layout while album data
  loads, and full-resolution WordPress artwork uses responsive Next Image
  optimization.
- Full review payloads load on demand through a one-hour cached detail endpoint,
  and editorial HTML is reduced to a server-side allowlist before rendering.
- Five structurally distinct desktop detail layouts are under temporary
  development-only prototype selection.
- The hinged record-shop interaction is the selected direction.
- Light mode uses the quiet listening-index palette; dark mode uses the warm
  record-shop palette. The operating-system preference is the initial default.

## Brand Commitments

The product is a personal music blog rooted in vinyl collecting, record shops,
and older cover-flow music players. Keep the implementation minimal and let the
selected hinged interaction remain the product's single browsing model.

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
