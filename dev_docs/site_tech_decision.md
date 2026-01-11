# Site Tech Decision — imnotyourson-photos

This document tracks the technical stack decisions, their trade-offs, and service quotas.

## Tech Stack

### 1. Astro (Static Site Generator)

**Pros:**
- Zero JavaScript by default (fast page loads)
- Content Collections provide type-safe frontmatter validation
- Excellent developer experience with component islands
- Simple deployment (static files)
- Good SEO fundamentals built-in

**Cons:**
- Smaller ecosystem compared to Next.js/Gatsby
- Less mature tooling for image optimization
- Fewer ready-made themes/templates

**Why chosen:**
- Aligns with "minimal maintenance" goal
- No runtime complexity (static output)
- Strong content authoring experience


### 2. Cloudflare Pages (Hosting)

**Pros:**
- Automatic deployments from Git
- Global CDN with excellent performance
- Zero cost for unlimited static sites
- Built-in preview deployments
- Tight integration with R2 and other Cloudflare services

**Cons:**
- Locked to Cloudflare ecosystem
- Less flexibility than self-hosted options
- Build time limits on free tier (500 builds/month)

**Why chosen:**
- Matches stack (R2 + Image Transformations on same platform)
- Reliable and fast
- No maintenance overhead


### 3. Cloudflare R2 (Object Storage)

**Pros:**
- Zero egress fees (unlike S3)
- S3-compatible API (easy migration if needed)
- Custom domain support for production URLs
- Tight integration with Cloudflare Pages and Workers

**Cons:**
- Smaller ecosystem than AWS S3
- Fewer third-party tools/integrations
- Requires Cloudflare account

**Why chosen:**
- No egress fees critical for photo-heavy site
- Custom domain support enables proper caching
- S3 compatibility provides exit strategy

**Free Tier Limits:**
- **Storage**: 10 GB/month free
  - Additional: $0.015 per GB/month

- **Write operations** (upload, list, delete): 1 million/month free
  - Additional: $4.50 per million operations

- **Read operations** (download, view): 10 million/month free
  - Additional: $0.36 per million operations

**Expected Usage:**
- Storage: ~5-10 GB for hundreds of photos (originals only)
- Write operations: <1,000/month (only when uploading new posts)
- Read operations: Depends on traffic; each photo view = 1 read
  - 10M free reads = ~333,333 photo views/month


### 4. Cloudflare Image Transformations

**Pros:**
- Runtime transformations (no build-time processing)
- Simple URL-based API (`/cdn-cgi/image/...`)
- Automatic format optimization (WebP/AVIF)
- Global caching reduces transformation cost
- Quality and dimension controls

**Cons:**
- Free tier quota is limited (5,000 unique transformations/month)
- Requires careful width standardization to avoid quota overruns
- Less control than build-time optimization

**Why chosen:**
- No local image processing needed (simplifies authoring)
- Automatic format delivery based on browser support
- Global caching offsets transformation limits

**Free Tier Limits:**
- **Unique transformations**: 5,000/month free
  - Each unique URL (`width=960`, `width=1440`, etc.) counts as one transformation
  - Subsequent requests for same URL are cached (free)

**Mitigation Strategy:**
- Use fixed width set only: 960, 1440, 1920
- 3 widths × ~200 photos = 600 transformations/month
- Leaves headroom for featured images, OG images, etc.


### 5. Fancybox (@fancyapps/ui) - Photo Viewer

**Pros:**
- Mature, well-tested library
- Excellent keyboard navigation
- Mobile-friendly with touch gestures
- Highly customizable
- Active maintenance

**Cons:**
- **Commercial license** (GPLv3 or paid commercial license)
- Larger bundle size than simpler alternatives
- More features than strictly needed

**Why chosen:**
- Referenced in Astro Photo Grid theme
- Reliable user experience
- License override: site is non-commercial (no revenue)


## Decision Log

### Image Delivery Strategy

**Decision:** Runtime transformations via Cloudflare (not build-time via Astro)

**Rationale:**
- Keeps build simple and fast
- No local image duplication
- Authors don't need to resize images manually
- Trade-off: Must carefully manage transformation quota

**Implementation:**
- Fixed widths: 960, 1440, 1920
- `srcset` generation in `src/utils/images.ts`
- Custom domain for R2 to enable caching


### Content Schema

**Decision:** Minimal frontmatter, auto-derived slugs

**Frontmatter fields:**
- `title`, `description`, `created_at`, `public` (boolean)
- `photos` (array of `{filename, alt}`)
- `featured_photo` (optional)

**Rationale:**
- Keeps authoring simple
- Slug auto-derived from filename (less duplication)
- Public flag allows draft posts without `.gitignore` complexity


### License Override: Fancybox

**Decision:** Use Fancybox despite GPLv3 license

**Context:**
- Site is non-commercial (no revenue)
- GPLv3 requires source code distribution (already on GitHub)
- Commercial license not needed for personal projects

**Mitigation:**
- Document decision in this file
- Could swap to MIT-licensed alternative (PhotoSwipe, yet-another-react-lightbox) if commercialization plans change


## Future Considerations

### If Traffic Grows Beyond Free Tiers

**R2 Read Operations (10M/month):**
- 10M reads ≈ 333K photo views/month
- If exceeded: $0.36 per additional million reads
- At 1M views/month: ~$1/month extra cost

**Image Transformations (5K/month):**
- Current: 3 widths × 200 photos = 600 transformations
- If new photos added rapidly: could approach limit
- Options: pay for Pro tier or reduce width variants

**R2 Storage (10 GB):**
- Current estimate: 5-10 GB
- If exceeded: $0.015/GB/month (e.g., 20 GB = $0.15/month)

### Potential Future Changes

- If traffic exceeds free tier: Cloudflare Pro ($20/month) increases all limits significantly
- If commercialization needed: Replace Fancybox with MIT-licensed alternative
- If dynamic features needed: Add Cloudflare Workers for server-side logic
