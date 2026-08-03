# Tim's Music Blog

A responsive record-shop browser for the music blog’s album archive.

```bash
pnpm dev
```

Open `http://localhost:3000/`. The catalog uses three groups on phones, five at
medium widths, and seven on desktop. Desktop lanes and their vertical geometry
scale with the viewport so 1080p and 4K displays keep the same composition. Its
light palette follows the quiet listening-index style;
its dark palette uses the warm record-shop treatment. The initial mode follows
the operating system and can be changed with the theme switch.

With a mouse, hover a record’s exposed resting edge to preview it and click to
open its review without leaving the catalog. The preview label fades while the
sleeve flies into a flat, full-size presentation beside a vertically centered,
content-sized review panel. Click empty backdrop space or press Escape to return
the sleeve to its row; scrolling and hovering resume as soon as dismissal
starts. On touch screens, the existing two-tap external-post flow remains in
place while the in-catalog detail experience is desktop-only. Starting another
scroll dismisses a preview. Reaching the last
album in every lane reveals the end-of-catalog message. WordPress access is
server-only and read-only.

The first 100 albums and WordPress's authoritative total are cached for one
hour. Every lane reserves its finite length from that total, so readers can keep
scrolling through placeholders while additional cached pages load. WordPress's
original artwork passes through responsive Next Image optimization, and an
immediate vinyl shell reserves the layout while the initial data hydrates.
Review bodies and track lists use the cached `/api/albums/[id]` endpoint. A
300ms desktop hover or the first touch selection starts prefetching, while a
compact loading status remains available when activation wins that race.
Allowed editorial HTML is sanitized on the server.

Five desktop detail layouts are temporarily available in development. Open an
album, then use the floating arrows, the keyboard’s left/right arrows, or share
`?detail=A` through `?detail=E`. The switcher is omitted from production builds.
