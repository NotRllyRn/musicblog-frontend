# Astro vs. Next.js for Orbit Notes

**Research date:** 2026-07-14  
**Scope:** framework choice for this repository; primary documentation only.
This is an architectural comparison, not a framework benchmark.

## Recommendation

**Do not rewrite the site in Astro solely for speed or visual-design reasons.
Keep Next.js 16 and reduce/client-test the interactive surface first.** The
repository already has a polished responsive foundation and uses React-specific
behavior throughout search, navigation, album cards, infinite scroll, theme
handling, and shadcn/Radix components. Astro would be a strong choice for a
mostly static publication, because its default is HTML with explicitly hydrated
“islands,” but this app’s browse experience is already an interactive React
application. A migration would therefore preserve substantial React client code
while replacing routing, images, fonts, navigation state, and theme plumbing.

This is still an early prototype—four routes are placeholders, album data is
mocked, and WordPress is not integrated—so **now is the least expensive time to
switch** if the product decision is firmly “mostly static articles with a few
interactive widgets.” Otherwise, retain Next and reconsider Astro if
WordPress-backed article and album-detail pages become the overwhelming majority
of traffic and can remain static, with search moved to a small isolated island
or server endpoint. Do not switch merely to make the UI look better: visual
quality comes from design, CSS, assets, responsive/accessibility work, and
component quality—not the rendering framework.

## What exists today

The installed stack is Next.js **16.2.6**, React/React DOM **19.2.4**, Tailwind
CSS 4, shadcn 4, Radix, and `next-themes`
([`package.json`](../../package.json)). A local production build succeeds. Next
prerenders the five public non-detail routes as static content; `/albums/[slug]`
is rendered on demand.

The App Router already server-renders the page shell and passes album data into
a client explorer, with a Suspense fallback
([`app/page.tsx`](../../app/page.tsx)). Important client behavior is deliberate:

- `AlbumExplorer` uses URL search parameters, `useDeferredValue`, transitions,
  filtering, and incremental reveal
  ([source](../../components/album-explorer.tsx)). React documents deferred
  rendering specifically as a way to keep an input responsive while slower UI
  catches up
  ([React: `useDeferredValue`](https://react.dev/reference/react/useDeferredValue)).
- Album cards use client state to expose hover content safely on touch devices
  ([source](../../components/album-card.tsx)).
- Navigation uses pathname state, a responsive Radix/shadcn sheet, and URL
  search ([source](../../components/nav-bar.tsx)).
- Theme state and a keyboard shortcut are client-managed by `next-themes`
  ([source](../../components/theme-provider.tsx)).
- Responsive grids, image `sizes`, focus states, and touch behavior already
  address multiple device classes; they still require real-device and
  accessibility testing.

There is also a concrete Next.js optimization available before any migration:
the detail route is currently a Client Component that first renders a loading
skeleton, then looks up mock data in `useEffect`
([route](../../app/albums/[slug]/page.tsx);
[template](../../components/album-post-template.tsx)). It can instead fetch
WordPress data in a Server Component and be statically generated/revalidated
where editorial requirements permit. Likewise, passing the full album corpus
into `AlbumExplorer` means the data and every interactive card cross the client
boundary; this should be revisited as the corpus grows.

This matters because neither framework eliminates the JavaScript required by
genuinely interactive behavior, while Next can remove JavaScript that the
current implementation uses unnecessarily.

## Evidence by goal

### 1. Snappy loading and runtime performance

**Static/content-heavy routes:** Astro has the clearer performance-by-default
model. It renders framework components to static HTML and sends no client
JavaScript unless a `client:*` directive hydrates an island
([Astro islands](https://docs.astro.build/en/concepts/islands/);
[framework components](https://docs.astro.build/en/guides/framework-components/)).
Album essays, About, and other read-only WordPress pages fit this model well.
Astro also supports build-time static output and opt-in on-demand rendering
([rendering modes](https://docs.astro.build/en/guides/on-demand-rendering/)).

Next.js can also keep non-interactive UI on the server: App Router pages/layouts
are Server Components by default, while only files behind a `"use client"`
boundary enter the client module graph
([Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)).
It supports prerendering and cache/revalidation controls for content routes
([Next.js caching](https://nextjs.org/docs/app/guides/caching)). Therefore
“Next.js” does not inherently mean shipping React for every article.

**This repository:** the likely optimization target is client-boundary breadth,
not the framework name. `NavBar`, `AlbumExplorer`, and every `AlbumCard` are
client components. Astro could express them as React islands, but interactive
islands still download and hydrate their framework runtime. Astro’s directives
allow load, idle, visibility, media-query, or interaction-oriented hydration
timing
([Astro directives](https://docs.astro.build/en/reference/directives-reference/#client-directives));
that is useful for noncritical widgets, but search results and first-screen
controls may need immediate interactivity.

No official, workload-matched benchmark establishes that a rewrite would improve
this app. Compare production builds using the same content, images, hosting
region, caching, and interaction paths; measure field Core Web Vitals rather
than relying on framework marketing. The web.dev definitions make clear that
LCP, INP, and CLS measure different aspects of user experience and should be
assessed at the 75th percentile ([Web Vitals](https://web.dev/articles/vitals)).

### 2. Smooth interaction

Next.js keeps the existing React 19 interaction model intact. React transitions
and deferred values are designed to prevent non-urgent rendering from blocking
urgent input
([`useTransition`](https://react.dev/reference/react/useTransition);
[`useDeferredValue`](https://react.dev/reference/react/useDeferredValue)). The
current explorer already uses both.

Astro can use the official React integration, so these components can be carried
over
([Astro React integration](https://docs.astro.build/en/guides/integrations-guide/react/)).
That is compatibility, not removal of hydration cost. Cross-island state and URL
synchronization also become an architectural concern. Astro’s `<ClientRouter />`
can provide animated client-side navigation and route lifecycle events, with
native View Transitions where supported and fallback behavior elsewhere
([Astro view transitions](https://docs.astro.build/en/guides/view-transitions/)).
Next.js has a built-in client router and `<Link>` prefetch/client transitions
([Next.js linking and navigating](https://nextjs.org/docs/app/getting-started/linking-and-navigating)).

For infinite scroll, preserve an accessible fallback (pagination or “load
more”), URL/history behavior, focus handling, and scroll restoration regardless
of framework. Astro does not make those interaction-design problems disappear.

### 3. Ease of use and maintenance

Staying avoids a rewrite and preserves first-class use of `next/image`,
`next/font`, App Router navigation hooks, Suspense boundaries, and the current
component set. Next’s image component provides sizing, lazy loading, and
format/loader facilities
([Next.js Image](https://nextjs.org/docs/app/api-reference/components/image));
its font module self-hosts and removes external font requests
([Next.js Font](https://nextjs.org/docs/app/api-reference/components/font)).
These would need Astro equivalents and visual/performance regression testing.

Astro is straightforward for content collections and static templates, and
supports React components through an official integration. Astro also has its
own image component/service
([Astro images](https://docs.astro.build/en/guides/images/)). However, migration
complexity is material here: replace Next routing/hooks/links/images/fonts,
rework global theme behavior, decide island boundaries, verify Radix portals and
mobile sheets, and rebuild deployment/revalidation around WordPress.

shadcn supports both Next.js and Astro through official installation paths
([shadcn Next.js](https://ui.shadcn.com/docs/installation/next);
[shadcn Astro](https://ui.shadcn.com/docs/installation/astro)). Its components
are copied source code rather than a hosted visual system, so either framework
permits customization. Existing Next-oriented components still need adaptation
in Astro when they rely on Next APIs.

### 4. Rendering well on all devices

Framework choice is secondary. Tailwind’s official responsive model is
mobile-first and supports breakpoint and container-query variants
([Tailwind responsive design](https://tailwindcss.com/docs/responsive-design);
[container queries](https://tailwindcss.com/docs/responsive-design#container-queries)).
The current CSS/grid and image `sizes` already use multiple breakpoints. Both
frameworks can emit responsive HTML/CSS and optimize images.

Quality on devices depends on semantic markup, correct image dimensions and
`sizes`, restrained JavaScript/main-thread work, keyboard/touch parity,
reduced-motion handling, contrast, and testing at real viewport/input/network
combinations. Astro’s lower default JavaScript can help content pages on
constrained devices; it cannot compensate for an oversized React island, poor
media choices, or inaccessible interaction design.

### 5. Designing a polished UI

**No inherent Astro advantage.** Both support Tailwind, React, shadcn,
Radix-style primitives, custom fonts, CSS transitions, and responsive layouts.
Astro may make content templates simpler; Next may make this React-heavy
component workflow simpler. Neither chooses typography, hierarchy, spacing,
artwork, motion, information architecture, or accessibility.

The repo already demonstrates polished-UI ingredients: design tokens in
`app/globals.css`, responsive grids, focus-visible styling, touch-specific card
disclosure, themed surfaces, and a mobile sheet. A redesign can be done without
migration. shadcn explicitly positions its components as editable code, which
makes polish dependent on the project’s implementation rather than the framework
([shadcn introduction](https://ui.shadcn.com/docs)).

## Decision implications

1. **Now — stay on Next.js 16 unless the product is already committed to being
   overwhelmingly static.** First make `/albums/[slug]` server-rendered/static
   where possible, establish production baselines for route payloads, LCP, INP,
   CLS, image bytes, and interaction behavior, and audit which components truly
   need `"use client"`. Keep article/detail bodies server-rendered and isolate
   controls.
2. **Treat static and interactive routes differently.** Prerender/revalidate
   WordPress content where freshness permits. Keep search/infinite-scroll/theme
   code client-side only where needed; consider server-backed search once the
   corpus no longer fits a small client payload.
3. **Run a bounded Astro proof of concept only if field data warrants it.**
   Rebuild one representative article route plus one full explorer route.
   Compare identical content and hosting, including cold load, search
   responsiveness, navigation, mobile menu, theme persistence, accessibility,
   build/deploy time, and editorial preview/revalidation.
4. **A hybrid is possible but adds operations.** Serving a static publication in
   Astro and an interactive explorer in Next can optimize each workload, but
   creates duplicated layouts/design tokens, routing/deployment complexity, and
   potentially inconsistent navigation. It is unjustified at the present size.

## Important caveats

- This is a source/docs review, not a production benchmark. There is no deployed
  URL, traffic mix, WordPress API shape, hosting target, cache policy, editorial
  preview requirement, or field telemetry in scope.
- Astro’s no-JavaScript default applies only to components not hydrated with
  `client:*`; React islands still incur client cost.
- Next.js performance depends on server/client boundaries, cache policy,
  deployment, and payload design; merely staying does not guarantee speed.
- Theme initialization can cause flashes or hydration differences in either
  stack and must be tested before first paint.
- Infinite scroll can harm accessibility, history, discoverability, memory use,
  and footer access unless intentionally designed.
- Version-sensitive implementation details should be rechecked against the
  installed Next documentation and the latest stable Astro migration/integration
  docs at proof-of-concept time. The recommendation relies on documented
  architecture, not a claim that Astro will retain a particular version-specific
  API.

## Bottom line

For a publication with a small interactive garnish, Astro is an excellent
default—and this prototype is early enough that switching would still be
feasible. **For the interaction model currently implemented in this repository,
however, retained React hydration and migration work outweigh an unmeasured
performance opportunity.** Keep Next, narrow interactive boundaries, integrate a
representative WordPress route, measure the real site, and revisit Astro if
content routes dominate or a like-for-like proof demonstrates a meaningful field
benefit.
