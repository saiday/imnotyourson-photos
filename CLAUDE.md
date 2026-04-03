# CLAUDE.md

Context for AI assistants working on this project.

## Essential Documents

- **Site goals and architecture**: `dev_docs/site_goals.md`
- **Development Plan for agents**: `dev_docs/development_plan.md`
- **Tech stack decisions and quotas**: `dev_docs/site_tech_decision.md`

## User Preferences

### Design Philosophy
- **Minimalism**: Keep layouts clean and simple, avoid unnecessary elements
- **No alt text**: Images should not have alt attributes (user preference)
- **Lowercase naming**: Use lowercase for navigation labels (e.g., "archive" not "Archive")

## Critical Rules

### 1. Pre-Generated WebP, Not Runtime Transformations
Images are pre-generated as WebP at upload time using Sharp, stored in R2, and served directly via CDN. No `/cdn-cgi/image/` transformations at runtime.
- Upload pipeline generates WebP at fixed widths (960, 1440, 1920) with quality 85
- R2 structure: `{prefix}/{name}.jpg` (original) + `{prefix}/w{width}/{name}.webp` (variants)
- Originals kept in R2 as master copies
- `getImageUrl()` returns direct R2 URLs, not transformation URLs
- This eliminates cold-start latency, transformation timeouts, and quota limits

### 2. Fixed Responsive Widths Only
Use the standardized set of widths (960, 1440, 1920) for all pre-generated variants.
- Don't generate arbitrary per-device widths
- Grid and gallery share the same pre-generated files (cache reuse)

### 3. License Requirements
Gallery/viewer components must use permissive licenses (MIT/Apache/BSD).
- Avoid GPL or commercial restrictions
- Verify licenses before adding dependencies

### 4. R2 Production Configuration
Use custom domain for R2 origin (not `r2.dev` URLs) to enable:
- Proper caching
- Rate limit avoidance
- Security controls

### 5. Maintenance Philosophy
- Prefer static rendering and stable dependencies
- Keep runtime surface area minimal
- Avoid over-engineering; implement only what's requested

## Quick Reference

- **Stack**: Astro + Cloudflare Pages + R2 (direct CDN, no Image Transformations)
- **Content**: Markdown/MDX, Git-based
- **Performance target**: Lighthouse >= 90, LCP < 2.5s
- **Dev testing**: browser-use MCP available for visual testing on localhost:4321
- **Open Graph**: Posts use `featured_photo` as 1920w WebP for social previews. Homepage/archive have no OG images by design.

## Workflows

### Creating New Posts

Run `npm run create-post`:
- Prompts for metadata (title, slug, description, images directory, suffix, featured photo, show_in_homepage)
- Reads images from directory, allows ordering and featured photo selection, preserves filenames (sanitized)
- Extracts dimensions, generates WebP variants at 960/1440/1920
- Uploads originals + WebP variants to R2
- Generates markdown with frontmatter, commits and pushes

### Backfilling Existing Posts

Run `node scripts/backfill-webp.mjs`:
- Downloads originals from R2, generates WebP variants, uploads back
- Skips images that already have variants
