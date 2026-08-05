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
floating switcher is development-only and the losing layouts should be deleted
after a winner is selected.

## Catalog search

Search uses the existing responsive record field rather than a second browsing
model. Server startup first obtains the normal 100-post page, then warms the
remaining ACF-and-taxonomy catalog pages three at a time into a process-local
index backed by Next's one-hour per-page cache. The browser never receives that
raw index.

After two normalized characters and a 280ms debounce, search filters titles and
all artist/genre terms locally, then returns lightweight 50-record result pages.
Only browser requests are aborted; no query-time request reaches WordPress. The
archive field remains mounted but hidden so clearing a query restores every
lane's prior position.

Result changes reconcile only focal sleeves through temporary flat proxies.
The proxy set is limited by rendered pixel area, interruptions continue from
current proxy positions, resizing cancels safely, and broad result sets,
reduced-motion, or very large viewports replace results immediately. This
prevents a nominally bounded animation from becoming an expensive full-screen
compositing pass at 4K.
