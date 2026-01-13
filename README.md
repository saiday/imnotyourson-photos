# imnotyourson-photos

Photography blog built with Astro, Cloudflare Pages, R2, and Image Transformations.

**Live:** [photos.imnotyourson.com](https://photos.imnotyourson.com)

## Setup

```bash
npm install
cp .env.example .env
# Edit .env: set PUBLIC_R2_URL
```

## Development

```bash
npm run dev        # Start dev server (localhost:4321)
npm run build      # Build for production
npm run preview    # Preview production build
```

## Create Post

```bash
npm run create-post
```

Prompts for title, slug, description, images directory. Uploads to R2, generates markdown, commits.

## Deploy

Push to GitHub. Cloudflare Pages auto-deploys.

```bash
git add -A
git commit -m "message"
git push
```

## Tech Stack

- Astro 5 + Cloudflare Pages
- R2 storage + Image Transformations
- Fancybox lightbox (GPLv3)

See `dev_docs/` for architecture and decisions.
