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

## Workflows

### Creating New Posts

```bash
npm run create-post
```

Interactive script that:
1. Prompts for metadata (title, slug, description, images directory suffix, show in homepage)
2. Collects images from a directory path
   - Lists all images in the directory alphabetically
   - Allows custom ordering via comma-separated indices (e.g., "1,3,2,5,4")
   - Preserves original filenames (sanitized: lowercase, hyphens for spaces)
   - Extracts image dimensions (width/height) using sharp
   - Handles duplicate filenames with numeric suffixes (-2, -3, etc.)
3. Uploads to R2 as `{suffix}/{sanitized-filename}.jpg`
4. Creates `src/content/posts/{slug}.md` with frontmatter including dimensions
5. Commits and pushes to git

Example: `vacation-photo.JPG` → uploads as `summer-2024/vacation-photo.jpg` with width/height in frontmatter
