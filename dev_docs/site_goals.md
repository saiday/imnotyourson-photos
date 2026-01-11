# Site Goals — imnotyourson-photos

## 1) Project summary
A low-maintenance photography presentation site (blog-first) hosted on Cloudflare Pages, built with Astro. Each blog post may contain up to 30 photos; the site contains hundreds of photos overall.

Images are stored in Cloudflare R2 and delivered via Cloudflare Image Transformations. Astro build-time image optimization (`getImage`) is intentionally not used.

## 2) Primary goals
1. Minimal maintenance and long-term stability:
   - Prefer static rendering, stable dependencies, and conservative upgrades.
   - Keep the runtime surface area small (no server/database unless required later).

2. Excellent multi-photo viewing experience inside posts:
   - Clean, consistent grid layout (Astro Photo Grid-style).
   - Simple, reliable “viewer” behavior (open, next/prev, keyboard navigation).
   - Mobile-friendly but pinch-to-zoom and advanced gestures are not required.

3. Fast and predictable image delivery:
   - Originals in R2; variants delivered via Cloudflare Transformations.
   - Fixed, limited set of responsive widths to control transformation cardinality and cost.

4. Content authoring is straightforward:
   - Writing in Markdown (or MDX only if needed).
   - Adding a post should not require manual image resizing.

## 3) Target audience
- Primary: readers viewing photo essays on mobile and desktop.
- Secondary: search engines and social media (SEO/OG correctness).

## 4) Non-goals
- No user accounts, comments, likes, or personalization in v1.
- No complex CMS in v1 (Git-based content only).
- No build-time image pipeline; no local image duplication for optimization.
- No requirement for pinch-to-zoom, deep gesture support, or app-like interactivity.

## 5) Key product decisions
### Domain
- Primary domain: **photos.imnotyourson.com**

### Homepage IA
- Homepage displays a single main photo
- Site has "archive" menu that presents a minimalist blog index (reverse chronological, titles only)
- Posts are the primary navigation unit; optional tags later

### Gallery layout and viewer
- Posts use **Astro Photo Grid** as the preferred gallery/viewer library.
- Viewer/lightbox component must use a permissive license (avoid GPL/commercial surprises).

### Images: storage and delivery strategy
- Store originals in Cloudflare R2.
- Serve derived variants using Cloudflare Transformations (via `/cdn-cgi/image/...`).
- Use a custom domain for R2 origin in production (avoid `r2.dev` rate limits and enable caching/security controls).

### Responsive width policy (quota/cost control)
- Standardize to a small number of widths (e.g., 960 / 1440 / 1920).
- Avoid per-device/per-layout arbitrary widths.

## 6) Quality bars (definition of done)
- Performance:
  - Lighthouse Performance target: ≥ 90 on typical post pages.
  - Largest Contentful Paint (LCP) target: < 2.5s on median mobile.
- Stability:
  - Reproducible builds and consistent deployments on Cloudflare Pages.
  - Dependency upgrades are batched and tested.
- Accessibility:
  - Keyboard navigation for viewer where applicable.
- SEO:
  - Valid canonical URLs, sitemap, RSS feed.
  - Correct Open Graph/Twitter cards for posts.

## 7) Risks and mitigations
- Cloudflare Transformations quota (e.g., 5,000 unique transformations/month on Free tier):
  - Mitigation: fixed width set; avoid varying transformation parameters.
- Licensing risk from gallery/viewer libraries:
  - Mitigation: choose MIT/Apache/BSD licensed viewer; document the license decision.
- R2 origin configuration pitfalls (caching, CORS):
  - Mitigation: document required headers and CORS policy; keep upload process consistent.

## 8) Decisions (answered)
- **Domain**: photos.imnotyourson.com
- **Photo captions**: NOT required (v1)
- **EXIF metadata display**: NOT required (v1)
- **Alt text on images**: NOT required (user prefers minimalism, alt is optional)
- **Frontmatter schema**: title, description, public (boolean), created_at (date), photos (array), featured_photo (optional)
- **Archive page**: Minimalist title list only (no thumbnails, no descriptions)

## 9) Content Creation Workflow

**Creating posts:** Run `npm run create-post`
- Interactive prompts for title, slug, description, images directory path, show in homepage
- Directory-based image collection:
  - Reads all images from specified directory
  - Displays numbered list, allows custom ordering via indices
  - Preserves original filenames (sanitized to web-safe format)
  - Extracts image dimensions (width/height) for justified gallery layout
  - Handles duplicate filenames with automatic numeric suffixes
- Uploads to R2 with semantic filenames (e.g., `vacation-beach.jpg` not `001.jpg`)
- Generates markdown with frontmatter including width/height for each photo
- Commits and pushes to git automatically

