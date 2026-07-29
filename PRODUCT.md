# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Music readers browsing a large personal archive of album reviews on a laptop.
They want to discover a record visually and open its existing blog post.

## Product Purpose

Turn a WordPress music blog into a tactile album catalog. Success means readers
can browse hundreds of covers quickly without the interface feeling like a
standard media grid.

## Positioning

The primary interaction borrows from flipping vinyl sleeves by hand: seven
borderless groups reveal one dimensional cover at a time.

## Operating Context

The catalog reads published posts and featured media from an existing WordPress
site. Each cover links to its existing WordPress post. WordPress is strictly
read-only from this frontend.

## Capabilities and Constraints

- Laptop-first catalog with seven independently scrolling album groups.
- No visible containers or separators between the free-floating records.
- The centered record is fully visible; surrounding records collapse into depth.
- Existing WordPress posts and featured images are the source of truth.
- Album-detail pages and mobile layouts are outside the current prototype.
- The current work is five disposable visual variants, not a production design.

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
