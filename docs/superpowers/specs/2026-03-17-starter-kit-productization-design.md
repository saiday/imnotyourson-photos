# Starter Kit Productization — Design Spec

## Development Note

All work for this spec should be developed on a **feature branch**, not directly on `main`.

## Overview

Transform imnotyourson-photos from a personal photography site into a packageable Astro starter kit that any photographer can deploy with the help of an AI agent.

Three workstreams:

1. **Centralized site config** — extract all hardcoded values into a single `site.config.ts`
2. **Draft recovery for create-post** — file-based resume mechanism for failed post creation
3. **Agent-readable setup guide** — a tutorial written for AI agents to execute on behalf of non-technical photographers

## Workstream 1: Centralized Site Config

### Goal

A single file (`site.config.ts`) at the project root that serves as the only place a new user needs to edit to make the site their own. All layouts, components, pages, utilities, and scripts read from this file.

### Config Schema

```ts
// site.config.ts
import type { SiteConfig } from './src/types/config';

export default {
  site: {
    name: "My Photo Blog",
    url: "https://photos.example.com",
    author: "Photographer Name",
    description: "A photography blog",
    tagline: "Your tagline here",  // Displayed on homepage hero
  },
  cloudflare: {
    r2PublicUrl: "https://images.example.com",
    r2BucketName: "my-photos",
    analyticsId: "",       // Cloudflare Web Analytics token (optional, leave empty to disable)
    googleAnalyticsId: "", // Google Analytics ID (optional, leave empty to disable)
  },
  navigation: [
    { label: "archive", href: "/archive" },
  ],
} satisfies SiteConfig;
```

### Type Definition

Located at `src/types/config.ts`:

```ts
export interface SiteConfig {
  site: {
    name: string;
    url: string;
    author: string;
    description: string;
    tagline: string;
  };
  cloudflare: {
    r2PublicUrl: string;
    r2BucketName: string;
    analyticsId: string;
    googleAnalyticsId: string;
  };
  navigation: Array<{
    label: string;
    href: string;
  }>;
}
```

Using `satisfies` preserves literal type inference while still validating against the interface.

### Design Decisions

- **TypeScript file, not JSON/YAML.** Allows type checking and IDE autocompletion. Importable from Astro components directly. For Node scripts, see "Cross-boundary import" below.
- **`site.tagline` is separate from `site.description`.** `description` is for meta tags / RSS / SEO. `tagline` is the personal line displayed on the homepage (currently hardcoded as "It was me, I let the dogs out." in `index.astro`). These serve different purposes and a single field would conflate them.
- **Analytics fields are optional.** Empty string means disabled — no analytics scripts are rendered. This removes the need for new users to find and delete hardcoded GA/Cloudflare analytics snippets.
- **Navigation is data-driven.** The Header component renders whatever is in the navigation array. The site title/home link is always present and separate from the navigation array — it is driven by `site.name` and always links to `/`.
- **`.env` reduces to auth-only secrets.** Wrangler tokens and similar credentials stay in `.env`. Site identity moves to `site.config.ts`.
- **`PUBLIC_R2_URL` env var is removed.** The R2 public URL now comes from config. The `images.ts` utility imports it directly.

### Cross-Boundary Import: Node Scripts and TypeScript Config

`scripts/create-post.mjs` is a plain Node.js script — it cannot natively import `.ts` files. To resolve this:

**Convert the script to TypeScript** and run it with `tsx`:
- Rename `scripts/create-post.mjs` → `scripts/create-post.ts`
- Add `tsx` as a dev dependency
- Update `package.json`: `"create-post": "tsx scripts/create-post.ts"`
- The script can then `import config from '../site.config.ts'` directly

This is the cleanest approach — no config duplication, full type safety, and `tsx` is a lightweight zero-config TypeScript runner.

### Astro Config Import Note

`astro.config.mjs` will import `site.config.ts` for the `site` URL. This works because Astro's config loader supports TypeScript imports at config-load time (before the full build pipeline). This is a standard Astro pattern — no special setup required.

### Files Changed

| File | Change |
|------|--------|
| `site.config.ts` | **New.** Central config file at project root. |
| `src/types/config.ts` | **New.** TypeScript interface for the config object. |
| `astro.config.mjs` | Import `site.config.ts` for `site` URL. |
| `src/layouts/BaseLayout.astro` | Read site name, description, analytics IDs from config. **Replace** hardcoded GA (`G-Q28HEXYGM4`) and Cloudflare analytics (`80523abe...`) scripts with conditional rendering — only emit `<script>` tags when the corresponding config ID is non-empty. |
| `src/components/Header.astro` | Read site name and navigation array from config. **Add navigation link rendering** — the component currently has CSS for `.site-nav` and `.nav-link` but no corresponding HTML. Add a `<nav>` element that iterates over `config.navigation` and renders links. |
| `src/layouts/PostLayout.astro` | Read site name from config (used in page title). |
| `src/pages/index.astro` | Read site name and tagline from config. Replace hardcoded `'imnotyourson'` and `'It was me, I let the dogs out.'`. |
| `src/pages/rss.xml.ts` | Read site name, URL, description, author from config. Replace hardcoded `'Photography blog by imnotyourson'`. |
| `src/pages/sitemap.xml.ts` | Read site URL from config. |
| `src/utils/images.ts` | Import R2 public URL from config instead of `import.meta.env.PUBLIC_R2_URL`. |
| `scripts/create-post.mjs` | Rename to `.ts`, import bucket name from config instead of hardcoded `'imnotyourson-photos'`. |
| `package.json` | Add `tsx` dev dependency. Update `create-post` script to use `tsx`. |
| `.env.example` | Remove `PUBLIC_R2_URL`. Keep only auth/secret vars. |
| `src/layouts/Layout.astro` | **Delete.** Unused Astro boilerplate file — not referenced anywhere. |
| `src/components/Welcome.astro` | **Delete.** Unused Astro boilerplate file — not referenced anywhere. |

## Workstream 2: Draft Recovery for create-post

### Goal

If `create-post` fails mid-execution (network drop, R2 timeout, user interrupt), the creator can re-run the command and resume from where it left off, without re-uploading images that already succeeded.

### Mechanism

**Draft file location:** `.drafts/<slug>.json` (project root)

**Lifecycle:**

1. **On start:** After metadata collection and image processing, the script writes a draft file containing all metadata and an image manifest with per-image status.
2. **During upload:** After each successful image upload, the script updates the draft file to mark that image as `uploaded`.
3. **On resume:** If the user runs `create-post` and enters a slug that has an existing draft file, the script offers to resume. If accepted, it skips metadata prompts, skips already-uploaded images, and continues uploading from the first non-uploaded image.
4. **On success:** After the markdown file is written and git operations complete (or are skipped), the draft file is deleted.
5. **On user cancel:** Draft file is preserved for future resume.

**Draft file is gitignored.** Add `.drafts/` to `.gitignore`.

### Draft File Schema

```json
{
  "version": 1,
  "slug": "prague-in-spring",
  "created_at": "2026-03-17T10:30:00.000Z",
  "originalSourceDir": "/Users/photographer/photos/prague-spring",
  "metadata": {
    "title": "Prague in Spring",
    "description": "Cherry blossoms along the Vltava.",
    "imagesSuffix": "prague-spring",
    "showInHomepage": true,
    "featuredIndex": 0
  },
  "images": [
    {
      "originalName": "img-001.jpg",
      "r2Path": "prague-spring/img-001.jpg",
      "localPath": "/tmp/create-post-xxx/img-001.jpg",
      "width": 4781,
      "height": 3187,
      "size": 2048000,
      "status": "uploaded"
    },
    {
      "originalName": "img-002.jpg",
      "r2Path": "prague-spring/img-002.jpg",
      "localPath": "/tmp/create-post-xxx/img-002.jpg",
      "width": 3200,
      "height": 2133,
      "size": 1536000,
      "status": "processed"
    }
  ]
}
```

**Image statuses:** `processed` (ready for upload), `uploaded` (confirmed in R2).

**`originalSourceDir`:** The directory the user originally provided for image collection. Stored so the script can re-read source images if temp files are gone on resume.

### Resume Flow

```
User runs: npm run create-post
  → Prompt: "Post slug:"
  → User enters: "prague-in-spring"
  → Script checks: .drafts/prague-in-spring.json exists?
    → Yes: "Found a draft for 'Prague in Spring' (3/10 images uploaded). Resume? [Y/n]"
      → Yes: Skip metadata prompts, skip uploaded images, continue uploading from image 4
      → No: "Delete existing draft and start fresh? [y/N]"
    → No: Proceed with normal flow, create draft after image processing
```

### Edge Cases

- **Local temp files gone** (e.g., machine restarted): The script detects missing local files for `processed` (not yet uploaded) images. It uses `originalSourceDir` from the draft to re-read and re-process those images. If the source directory is also unavailable, it prompts the user to provide a new directory path.
- **Slug collision with published post:** Same as current behavior — asks whether to overwrite.
- **Multiple drafts:** Each draft is keyed by slug. Running `create-post` with a different slug doesn't affect existing drafts.

### Files Changed

| File | Change |
|------|--------|
| `scripts/create-post.ts` | Add draft read/write/resume logic (file is already being renamed from `.mjs` in Workstream 1). |
| `.gitignore` | Add `.drafts/` entry. |
| `.drafts/` | **New directory.** Created by script on first use, gitignored. |

## Workstream 3: Agent-Readable Setup Guide

### Goal

A single document that an AI coding agent can read and execute to set up a fully working photography site for a non-technical photographer.

### Location

`docs/setup-guide.md`

### Structure

#### Section 1: For the Photographer (Human-Readable Intro)

3-4 sentences in plain language:
- What this project is (a photography blog you own and control)
- Why Cloudflare: generous free tier that covers most photography sites for free, global CDN ensures fast loading for large photos worldwide, built-in image transformations (automatic resizing and format optimization without any build step)
- Call to action: "If you're not a tech person, find an AI coding agent (Claude Code, Cursor, Copilot, etc.) and point it at this guide. It will know how to set up everything for you."

#### Section 2: Prerequisites

What the agent needs to verify or install:
- Node.js (version requirement)
- Git
- A Cloudflare account (link to signup)
- Wrangler CLI (`npm install -g wrangler`)

#### Section 3: Cloudflare Setup

Step-by-step for the agent to guide the photographer through:
1. Create Cloudflare account (if not exists)
2. Enable R2 storage
3. Create R2 bucket (naming convention)
4. Configure custom domain for R2 bucket (why: caching, no rate limits, security)
5. Enable Image Transformations (why: automatic resizing without build-time processing)
6. Generate API token for Wrangler (required permissions)
7. Set up Cloudflare Pages project (connect to Git repository)

Each step includes: what to do, why it matters, how to verify it worked.

#### Section 4: Project Setup

1. Clone/fork the repository
2. `npm install`
3. Edit `site.config.ts` — field-by-field explanation of what each value means
4. Authenticate Wrangler (`wrangler login`)
5. `npm run build` — verify no errors
6. Deploy: push to Git triggers Cloudflare Pages build automatically, OR `npm run deploy` for manual deployment via Wrangler
7. Verify the live site loads

#### Section 5: Creating Your First Post

1. Prepare images (just put JPEGs in a folder)
2. Run `npm run create-post`
3. Walk through each prompt
4. Verify the post appears on the live site

#### Section 6: Customization

Brief descriptions of what each file controls, with links to Astro documentation for deeper learning:
- `site.config.ts` — site identity, Cloudflare settings, navigation links
- `src/layouts/BaseLayout.astro` — HTML shell, global styles, meta tags
- `src/layouts/PostLayout.astro` — blog post page structure
- `src/components/Header.astro` — site header and navigation
- `src/components/PhotoGrid.astro` — photo gallery grid and lightbox
- `src/pages/index.astro` — homepage layout
- `src/pages/archive/index.astro` — archive page layout
- Link to Astro docs for component authoring, styling, routing

#### Section 7: Ongoing Maintenance

- How to update dependencies (`npm update`, test, deploy)
- What to monitor (Cloudflare dashboard: R2 usage, transformation quota)
- How to add/remove analytics (edit `site.config.ts`, empty string disables)

### Writing Principles

- Written for AI agents as the primary reader — precise, structured, unambiguous
- No re-teaching of Astro or Cloudflare basics — link to official docs
- Every instruction has a verification step ("you should see X")
- Sections are independent enough that an agent can skip completed steps

## Summary of All New and Changed Files

### New Files
| File | Purpose |
|------|---------|
| `site.config.ts` | Centralized site configuration |
| `src/types/config.ts` | TypeScript interface for config |
| `docs/setup-guide.md` | Agent-readable setup tutorial |
| `.drafts/` | Draft recovery directory (gitignored) |

### Changed Files
| File | Change |
|------|--------|
| `astro.config.mjs` | Import site URL from config |
| `src/layouts/BaseLayout.astro` | Read config; replace hardcoded analytics with conditional rendering |
| `src/components/Header.astro` | Read config; add navigation link rendering (new HTML, existing CSS) |
| `src/layouts/PostLayout.astro` | Read config for site name |
| `src/pages/index.astro` | Read config for site name and tagline |
| `src/pages/rss.xml.ts` | Read config for site name, URL, description, author |
| `src/pages/sitemap.xml.ts` | Read config for site URL |
| `src/utils/images.ts` | Import R2 URL from config |
| `scripts/create-post.mjs` → `scripts/create-post.ts` | Convert to TS; import config; add draft recovery |
| `package.json` | Add `tsx` dev dep; update create-post script |
| `.env.example` | Remove `PUBLIC_R2_URL`, keep only auth secrets |
| `.gitignore` | Add `.drafts/` |

### Deleted Files
| File | Reason |
|------|--------|
| `src/layouts/Layout.astro` | Unused Astro boilerplate, not referenced anywhere |
| `src/components/Welcome.astro` | Unused Astro boilerplate, not referenced anywhere |

### Removed
| Item | Reason |
|------|--------|
| `PUBLIC_R2_URL` env var | Replaced by `site.config.ts` cloudflare.r2PublicUrl |

## Out of Scope (Future Considerations)

- Edit/update existing posts (`npm run edit-post`)
- Image deletion from R2
- Bulk post import
- Multi-tenant / hosted platform mode
- Custom theming system beyond standard Astro component editing
- `--list-drafts` CLI flag
- Fancybox replacement (deferred — current GPLv3 usage is acceptable for now)
