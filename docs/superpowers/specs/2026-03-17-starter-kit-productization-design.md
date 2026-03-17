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
export default {
  site: {
    name: "My Photo Blog",
    url: "https://photos.example.com",
    author: "Photographer Name",
    description: "A photography blog",
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
}
```

### Design Decisions

- **TypeScript file, not JSON/YAML.** Allows type checking and IDE autocompletion. Importable from both Astro components and Node scripts.
- **Analytics fields are optional.** Empty string means disabled — no analytics scripts are rendered. This avoids the common "delete the GA snippet" step for new users.
- **Navigation is data-driven.** The Header component renders whatever is in the array. Creators add/remove links by editing config, not component code.
- **`.env` reduces to auth-only secrets.** Wrangler tokens and similar credentials stay in `.env`. Site identity moves to `site.config.ts`.
- **`PUBLIC_R2_URL` env var is removed.** The R2 public URL now comes from config. The `images.ts` utility imports it directly.

### Files Changed

| File | Change |
|------|--------|
| `site.config.ts` | **New.** Central config file. |
| `astro.config.mjs` | Import `site.config.ts` for `site` URL. |
| `src/layouts/BaseLayout.astro` | Read site name, description, analytics IDs from config. Conditionally render analytics scripts only when IDs are non-empty. |
| `src/components/Header.astro` | Read site name and navigation array from config. |
| `src/layouts/PostLayout.astro` | Read site name from config (used in page title). |
| `src/pages/index.astro` | Read site name from config. |
| `src/pages/rss.xml.ts` | Read site name, URL, description, author from config. |
| `src/pages/sitemap.xml.ts` | Read site URL from config. |
| `src/utils/images.ts` | Import R2 public URL from config instead of `import.meta.env.PUBLIC_R2_URL`. |
| `scripts/create-post.mjs` | Import R2 bucket name from config instead of hardcoded `BUCKET_NAME`. |
| `.env.example` | Remove `PUBLIC_R2_URL`. Keep only auth/secret vars. |

### Type Safety

Export a TypeScript type for the config object so that IDE autocompletion works and invalid config is caught at build time:

```ts
interface SiteConfig {
  site: {
    name: string;
    url: string;
    author: string;
    description: string;
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

- **Local temp files gone** (e.g., machine restarted): The script detects missing local files for `processed` (not yet uploaded) images. It re-reads from the original source directory if available, or prompts the user to provide the directory again.
- **Slug collision with published post:** Same as current behavior — asks whether to overwrite.
- **Multiple drafts:** Each draft is keyed by slug. Running `create-post` with a different slug doesn't affect existing drafts. A `--list-drafts` flag could list pending drafts (optional, not required for v1).

### Files Changed

| File | Change |
|------|--------|
| `scripts/create-post.mjs` | Add draft read/write/resume logic. |
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
- Why Cloudflare: generous free tier, global CDN ensures fast loading for large photos worldwide, built-in image transformations (automatic resizing and format optimization)
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

Each step includes: what to do, why it matters, how to verify it worked.

#### Section 4: Project Setup

1. Clone/fork the repository
2. `npm install`
3. Edit `site.config.ts` — field-by-field explanation of what each value means
4. Authenticate Wrangler (`wrangler login`)
5. `npm run build` — verify no errors
6. `npm run deploy` — first deployment
7. Verify the live site loads

#### Section 5: Creating Your First Post

1. Prepare images (just put JPEGs in a folder)
2. Run `npm run create-post`
3. Walk through each prompt
4. Verify the post appears on the live site

#### Section 6: Customization

Brief descriptions of what each file controls, with links to Astro documentation for deeper learning:
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
- How to add/remove analytics

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
| `docs/setup-guide.md` | Agent-readable setup tutorial |
| `.drafts/` | Draft recovery directory (gitignored) |

### Changed Files
| File | Change |
|------|--------|
| `astro.config.mjs` | Import site URL from config |
| `src/layouts/BaseLayout.astro` | Read config for site name, description, analytics (conditional rendering) |
| `src/components/Header.astro` | Read config for site name, navigation |
| `src/layouts/PostLayout.astro` | Read config for site name |
| `src/pages/index.astro` | Read config for site name |
| `src/pages/rss.xml.ts` | Read config for site name, URL, description, author |
| `src/pages/sitemap.xml.ts` | Read config for site URL |
| `src/utils/images.ts` | Import R2 URL from config |
| `scripts/create-post.mjs` | Import bucket name from config; add draft recovery logic |
| `.env.example` | Remove `PUBLIC_R2_URL`, keep only auth secrets |
| `.gitignore` | Add `.drafts/` |

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
