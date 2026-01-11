# CLAUDE.md

Context for AI assistants working on this project.

## Essential Documents

- **Site goals and architecture**: `dev_docs/site_goals.md`
- **Development Plan for agents**: `dev_docs/development_plan.md`
- **Tech stack decisions and quotas**: `dev_docs/site_tech_decision.md`

## Critical Rules

### 1. NO Build-Time Image Optimization
**Never** use Astro's `getImage` or build-time image processing. All images:
- Store originals in Cloudflare R2
- Deliver via Cloudflare Image Transformations (`/cdn-cgi/image/...`)
- Never duplicate or process locally

### 2. Fixed Responsive Widths Only
Use a standardized set of widths (e.g., 960, 1440, 1920) to control Cloudflare Transformations quota.
- Don't generate arbitrary per-device widths
- Don't vary transformation parameters unnecessarily

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

- **Stack**: Astro + Cloudflare Pages + R2 + Image Transformations
- **Content**: Markdown/MDX, Git-based
- **Performance target**: Lighthouse ≥ 90, LCP < 2.5s
- **Dev testing**: browser-use MCP available for visual testing on localhost:4321
