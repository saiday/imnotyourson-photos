# imnotyourson-photos

A minimalist photography blog built with Astro, hosted on Cloudflare Pages with R2 storage and Image Transformations.

Live site: [photos.imnotyourson.com](https://photos.imnotyourson.com)

## Overview

This is a low-maintenance photography presentation site designed for showcasing photo essays. Images are stored in Cloudflare R2 and delivered via Cloudflare Image Transformations for optimal performance and cost efficiency.

### Tech Stack

- **Static Site Generator**: Astro 5
- **Hosting**: Cloudflare Pages
- **Image Storage**: Cloudflare R2
- **Image Delivery**: Cloudflare Image Transformations
- **Photo Viewer**: Fancybox (GPLv3, non-commercial use)
- **Content**: Markdown/MDX with Git-based workflow

### Key Features

- Fast static site generation with minimal JavaScript
- Runtime image transformations (no build-time processing)
- Responsive image delivery with fixed width standardization
- Clean gallery layout with lightbox viewer
- SEO-optimized with Open Graph support

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Cloudflare account with R2 enabled
- Wrangler CLI authenticated (`npx wrangler whoami`)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/imnotyourson-photos.git
cd imnotyourson-photos

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and set PUBLIC_R2_URL to your R2 custom domain
```

### Development

```bash
# Start local dev server
npm run dev

# Open http://localhost:4321
```

### Build

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview
```

### Deployment

The site automatically deploys to Cloudflare Pages on push to the main branch. For manual deployment:

```bash
npm run deploy
```

## Content Authoring

### Creating a New Post

Use the interactive post creation script:

```bash
npm run create-post
```

This script will:
1. Prompt for post metadata (title, slug, description)
2. Ask for the directory containing your images
3. Allow you to order images and select a featured photo
4. Extract image dimensions automatically
5. Upload images to R2 with sanitized filenames
6. Generate markdown file with complete frontmatter
7. Commit changes and push to Git

### Post Structure

Posts are stored in `src/content/posts/` as Markdown files with YAML frontmatter:

```yaml
---
title: "Post Title"
description: "Brief description for SEO and social media"
public: true
created_at: 2026-01-13T00:00:00.000Z
show_in_homepage: true
featured_photo: "photo-001.jpg"
photos:
  - filename: "photo-001.jpg"
    width: 3000
    height: 2000
  - filename: "photo-002.jpg"
    width: 4000
    height: 3000
---

Your post content here.
```

### Image Naming Conventions

- Use descriptive, lowercase filenames with hyphens
- Example: `autumn-forest-sunset.jpg`
- The create-post script automatically sanitizes filenames

### Responsive Image Delivery

Images are delivered through Cloudflare Image Transformations with standardized widths:
- 960px (mobile)
- 1440px (tablet)
- 1920px (desktop)

This standardization controls transformation quota usage and ensures consistent performance.

## Project Structure

```
/
├── dev_docs/              # Technical documentation
│   ├── site_goals.md      # Project objectives and decisions
│   ├── site_tech_decision.md  # Stack decisions and quotas
│   ├── r2_setup_guide.md  # R2 configuration guide
│   └── operational_atlas/
│       └── runbooks/      # Operational procedures
├── public/                # Static assets
├── scripts/               # Build and content scripts
│   └── create-post.mjs    # Post creation automation
├── src/
│   ├── components/        # Astro components
│   ├── content/
│   │   └── posts/         # Blog posts (Markdown)
│   ├── layouts/           # Page layouts
│   ├── pages/             # Routes
│   └── utils/             # Helper functions
└── package.json
```

## Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# R2 custom domain URL
PUBLIC_R2_URL=https://images.imnotyourson.com
```

### Cloudflare R2 Setup

See `dev_docs/r2_setup_guide.md` for complete setup instructions including:
- Creating R2 bucket
- Configuring custom domain
- Enabling Image Transformations
- Upload workflows

## Troubleshooting

### Images not loading

1. Verify R2 bucket is accessible: `curl -I https://images.imnotyourson.com/test.jpg`
2. Check PUBLIC_R2_URL in `.env` matches your custom domain
3. Ensure images were uploaded with `--remote` flag

### Image transformations failing

1. Verify Image Resizing is enabled in Cloudflare Dashboard (Speed → Optimization)
2. Check transformation URL syntax: `/cdn-cgi/image/width=960,format=auto/filename.jpg`
3. Monitor quota usage in Dashboard (see quota_monitoring.md)

### Build failures

1. Clear Astro cache: `rm -rf .astro node_modules/.astro`
2. Reinstall dependencies: `npm install`
3. Check for type errors: `npm run astro check`

### Local development issues

1. Ensure Node.js version is 18+: `node --version`
2. Clear build artifacts: `rm -rf dist`
3. Restart dev server: `npm run dev`

## Performance

### Target Metrics

- Lighthouse Performance: ≥ 90
- Largest Contentful Paint (LCP): < 2.5s
- First Input Delay (FID): < 100ms
- Cumulative Layout Shift (CLS): < 0.1

### Optimization Strategies

- Static site generation (zero JavaScript by default)
- Runtime image transformations with WebP/AVIF
- Fixed responsive width set to minimize transformation quota
- Global CDN delivery via Cloudflare Pages
- Lazy loading for below-the-fold images

## Monitoring

### Cloudflare Quotas

Monitor usage regularly (see `dev_docs/operational_atlas/runbooks/quota_monitoring.md`):

**Free Tier Limits:**
- R2 Storage: 10 GB/month
- R2 Read Operations: 10 million/month
- R2 Write Operations: 1 million/month
- Image Transformations: 5,000 unique/month

**Current Usage Strategy:**
- Fixed widths (3 variants) × ~200 photos = 600 transformations/month
- Leaves significant headroom for growth

### Backup Strategy

See `dev_docs/operational_atlas/runbooks/backup_restore.md` for:
- Local copy retention
- R2 inventory exports
- Disaster recovery procedures

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**Note on Dependencies:**
- Fancybox (@fancyapps/ui) is licensed under GPLv3 for non-commercial use
- This site is non-commercial (no revenue generation)
- Source code is publicly available on GitHub (GPLv3 compliance)
- See LICENSE file for full attribution

## Contributing

This is a personal photography blog, but issues and suggestions are welcome.

## Additional Resources

- **Site Goals**: `dev_docs/site_goals.md`
- **Tech Decisions**: `dev_docs/site_tech_decision.md`
- **R2 Setup**: `dev_docs/r2_setup_guide.md`
- **Development Plan**: `dev_docs/development_plan.md`
- **Operational Runbooks**: `dev_docs/operational_atlas/runbooks/`

## Support

For questions or issues, please open a GitHub issue.
