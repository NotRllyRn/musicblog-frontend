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
site. Each cover links to its existing WordPress post. WordPress is strictly
read-only from this frontend.

## Capabilities and Constraints

- Three independently scrolling album groups on phones, five at medium widths,
  and seven on desktop displays.
- Catalog content is capped and centered on ultrawide displays.
- No visible containers or separators between the free-floating records.
- The centered record is fully visible; surrounding records collapse into depth.
- Mouse users hover to preview; touch users tap once to preview and again to open.
- Starting another scroll dismisses the current preview.
- Existing WordPress posts and featured images are the source of truth.
- Album-detail pages remain outside the current prototype.
- The hinged record-shop interaction is the selected direction.

## Brand Commitments

The product is a personal music blog rooted in vinyl collecting, record shops,
and older cover-flow music players. Keep the implementation minimal, modular,
and easy to extend after a direction is selected.

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
