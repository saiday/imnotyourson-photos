# Development Plan — imnotyourson-photos

Comprehensive plan for building the photography presentation site MVP and future enhancements.

## Overview

**Objective**: Build an MVP photography blog with photo grid layout, hosted on Cloudflare Pages with R2 image storage.

**Tech Stack**:
- Framework: Astro (already initialized)
- Hosting: Cloudflare Pages
- Storage: Cloudflare R2
- Image Delivery: Cloudflare Image Transformations
- Gallery: Astro Photo Grid

**Domain**: photos.imnotyourson.com

## Phase 1: Infrastructure Setup

### 1.1 Cloudflare R2 Bucket
- [x] Create R2 bucket for image storage (bucket: `imnotyourson-photos`)
- [ ] Configure bucket CORS policy (allow GET requests from domain)
- [x] Set up R2 custom domain (photos.imnotyourson.com)
- [x] Document bucket name and endpoint configuration

### 1.2 Cloudflare Pages
- [ ] Connect GitHub repository to Cloudflare Pages
- [ ] Configure build settings:
  - Build command: `npm run build`
  - Build output directory: `dist`
  - Node version: (confirm Astro requirements)
- [ ] Set up custom domain: photos.imnotyourson.com
- [ ] Configure DNS records

### 1.3 Environment Configuration
- [x] Define environment variables for:
  - R2 bucket name
  - R2 public URL / custom domain
  - Image transformation base URL
- [x] Create `.env.example` file for local development
- [ ] Document environment setup in README

## Phase 2: Content Structure & Schema ✅ COMPLETED

### 2.1 Directory Structure ✅
```
src/
├── content/
│   └── posts/           # Blog posts (Markdown/MDX)
│       ├── sample-post.md
│       └── ...
├── layouts/
│   ├── BaseLayout.astro    # Site-wide layout
│   └── PostLayout.astro    # Blog post layout
├── pages/
│   ├── index.astro         # Homepage (single main photo)
│   ├── series/
│   │   └── index.astro     # Blog index (reverse chronological)
│   └── posts/
│       └── [slug].astro    # Dynamic post route
└── components/
    ├── PhotoGrid.astro     # Photo grid component
    └── Header.astro        # Site navigation
```

### 2.2 Frontmatter Schema ✅
Content collection schema defined in `src/content/config.ts`:

```typescript
// Post schema
{
  title: string;           // Post title
  description: string;     // Post description (for SEO/OG)
  slug: string;            // URL slug
  public: boolean;         // Visibility flag
  created_at: Date;        // Publication date
  photos: Array<{          // Photo array
    filename: string;      // R2 filename
    alt: string;           // Alt text for accessibility
  }>;
  featured_photo?: string; // Optional: filename for OG/thumbnail
}
```

### 2.3 Create Sample Post ✅
- [x] Create `src/content/posts/sample-post.md` with proper frontmatter
- [x] Use placeholder photos (5-10 images) or upload sample images to R2
- [x] Include varied alt text for accessibility testing
- [x] This post serves as the base for testing during Phase 3 development
- [x] Validate frontmatter matches schema definition

### 2.4 Image URL Helper ✅
- [x] Create utility function to generate Cloudflare Image Transformation URLs (`src/utils/images.ts`)
- [x] Support fixed responsive widths: 960, 1440, 1920
- [x] Implementation: `/cdn-cgi/image/width=1440,format=auto/{r2-url}`

## Phase 3: MVP Development ✅ COMPLETED

### 3.1 Base Layout & Styling ✅
- [x] Set up BaseLayout.astro with:
  - HTML structure
  - Meta tags (SEO basics: Open Graph, Twitter Cards)
  - Global styles (vanilla CSS with CSS variables)
- [x] Create Header component with:
  - Site title
  - Navigation to "Series" page
- [x] Set up responsive typography and spacing

### 3.2 Homepage (Single Photo Display) ✅
- [x] Create `src/pages/index.astro`
- [x] Display single featured photo (from R2 via Image Transformations)
- [x] Add minimal text/tagline
- [x] Link to Series page

### 3.3 Series Index (Blog List) ✅
- [x] Create `src/pages/series/index.astro`
- [x] Query all posts from content collection
- [x] Filter by `public: true`
- [x] Sort by `created_at` (reverse chronological)
- [x] Display list with:
  - Post title
  - Description
  - Featured photo thumbnail
  - Link to post

### 3.4 Post Template & Photo Grid ✅
- [x] Create `src/pages/posts/[slug].astro` (dynamic route)
- [x] Create PostLayout.astro with:
  - Post title and metadata
  - Post description
  - Photo grid container
- [x] Photo Grid implementation:
  - [x] Use Fancybox (@fancyapps/ui) for lightbox (license override: non-commercial)
  - [x] Create PhotoGrid.astro component
  - [x] Configure grid layout (CSS Grid)
  - [x] Pass photos array from frontmatter
  - [x] Generate Image Transformation URLs for each photo (fixed widths)
  - [x] Enable lightbox/viewer functionality with keyboard navigation
- [x] Test with sample post (5 photos uploaded to R2)
- [ ] Visual testing via browser-use MCP (limited: cloud can't access localhost)

### 3.5 Image Transformation Integration ✅
- [x] Implement helper to build transformation URLs in `src/utils/images.ts`:
  ```
  /cdn-cgi/image/width=1440,format=auto/{r2-custom-domain}/{filename}
  ```
- [x] Use `srcset` with fixed widths (960, 1440, 1920)
- [x] Set `sizes` attribute for responsive images
- [x] Validate transformation quota usage (16 transformations used, 0.32% of quota)

## Phase 4: Content Authoring & Testing

### 4.1 Additional Sample Content
- [ ] Create 1-2 additional sample posts with photos
- [ ] Upload additional sample photos to R2 bucket (if not done earlier)
- [ ] Test full authoring workflow:
  - Write Markdown file with frontmatter
  - Upload photos to R2
  - Reference filenames in frontmatter
  - Build and preview locally

### 4.2 Local Development Setup
- [ ] Document `npm run dev` workflow
- [ ] Configure local environment variables
- [ ] Test hot-reloading and content updates
- [ ] Use browser-use MCP for visual validation during development

## Phase 5: SEO & Performance

### 5.1 SEO Basics
- [ ] Add canonical URLs to all pages
- [ ] Generate sitemap.xml (use Astro integration)
- [ ] Create RSS feed for blog posts
- [ ] Add Open Graph meta tags:
  - og:title, og:description, og:image (featured photo)
  - og:type: article for posts
- [ ] Add Twitter Card meta tags

### 5.2 Performance Optimization
- [ ] Set `format=auto` in Image Transformations (serve WebP/AVIF)
- [ ] Add `loading="lazy"` for below-fold images
- [ ] Run Lighthouse audit on sample post page
- [ ] Target: Performance ≥ 90, LCP < 2.5s
- [ ] Optimize CSS (inline critical CSS if needed)
- [ ] Check bundle size and minimize dependencies

### 5.3 Accessibility
- [ ] Verify alt text on all images
- [ ] Test keyboard navigation in photo viewer
- [ ] Check color contrast and focus indicators
- [ ] Run axe or similar accessibility audit

## Phase 6: Deployment & Validation

### 6.1 First Deployment
- [ ] Push to GitHub main branch
- [ ] Trigger Cloudflare Pages build
- [ ] Verify build succeeds and site deploys
- [ ] Test on custom domain: photos.imnotyourson.com

### 6.2 Post-Deployment Validation
- [ ] Test all pages on mobile and desktop (browser-use MCP can automate)
- [ ] Verify image transformations load correctly
- [ ] Check photo grid and viewer functionality
- [ ] Validate SEO meta tags (use tools like metatags.io)
- [ ] Monitor Cloudflare Transformations quota usage

### 6.3 Documentation
- [ ] Update README.md with:
  - Project overview
  - Local development setup
  - Deployment process
  - Content authoring guide
- [ ] Document R2 upload process
- [ ] Document environment variables
- [ ] Add troubleshooting section

## Phase 7: Future Enhancements (Post-MVP)

### 7.1 Content Features
- [ ] Add tags/categories to posts
- [ ] Implement tag filtering on Series page
- [ ] Add search functionality
- [ ] Optional: per-photo captions (if needed later)
- [ ] Optional: EXIF metadata display (if needed later)

### 7.2 Performance & Infrastructure
- [ ] Implement CDN caching headers optimization
- [ ] Add image upload CLI tool or script
- [ ] Batch image upload and optimization workflow
- [ ] Consider image compression before R2 upload

### 7.3 User Experience
- [ ] Improve homepage design (hero section, featured posts)
- [ ] Add pagination to Series index (if post count grows)
- [ ] Enhance photo viewer (gestures, transitions)
- [ ] Add dark mode support

### 7.4 Analytics & Monitoring
- [ ] Add privacy-friendly analytics (Cloudflare Analytics, Plausible, etc.)
- [ ] Monitor Cloudflare Transformations quota
- [ ] Set up uptime monitoring
- [ ] Track Core Web Vitals

## Success Criteria (MVP)

- [ ] R2 bucket and Cloudflare Pages deployed
- [ ] Custom domain configured
- [ ] Homepage displays single featured photo
- [ ] Series page lists all public posts
- [ ] Post pages display photo grid with 10-30 photos
- [ ] Photo viewer/lightbox works with keyboard navigation
- [ ] Lighthouse Performance ≥ 90
- [ ] LCP < 2.5s on median mobile
- [ ] Valid SEO meta tags and sitemap
- [ ] Content authoring workflow documented

## Image Transformation Quota Tracking

**Strategy**: On-demand runtime transformations (not pre-generated)
- Upload originals only to R2
- First request generates transformation (counts toward quota)
- Subsequent requests served from global edge cache (FREE)

**Fixed Widths Used**: 960, 1440, 1920 (3 sizes per photo)

**Current Usage** (as of 2026-01-11):
- Sample post: 5 photos × 3 widths = **15 transformations**
- Featured photo (OG image): 1 photo × 1 width = **1 transformation**
- **Total to date: 16 transformations** (0.32% of 5,000/month quota)

**Projected Usage**:
- 10 posts (50 photos): ~150 transformations/month
- 30 posts (300 photos): ~900 transformations/month
- Safe margin: Stay under 3,000 transformations to leave headroom

**Update this section** when adding new posts or changing transformation parameters.

## Notes

- **Image Optimization Rule**: Never use Astro's `getImage` or build-time optimization
- **Responsive Widths**: Stick to 960, 1440, 1920 to control quota
- **License Override**: Using Fancybox (GPLv3) for non-commercial site
- **Transformation Quota**: Monitor monthly usage (Free tier = 5,000 unique transformations)
