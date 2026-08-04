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
sleeve flies into a flat presentation beside a vertically centered,
content-sized review panel. On touch screens, tap once to preview and prefetch,
then tap the same sleeve again to open its review. At compact widths the sleeve
centers above an equally wide review panel, and the overlay scrolls as one
continuous page. Crossing the compact breakpoint while details are open fades
smoothly between arrangements while the catalog keeps its responsive three,
five, or seven lanes. Click or tap empty backdrop space, or press Escape, to
return the sleeve to its row; catalog interaction resumes as soon as dismissal
starts. Starting another catalog scroll dismisses a preview. Reaching the last
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

Five responsive detail layouts are temporarily available in development. Open
an album, then use the floating arrows, the keyboard’s left/right arrows, or share
`?detail=A` through `?detail=E`. The switcher is omitted from production builds.
