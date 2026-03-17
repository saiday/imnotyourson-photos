# Starter Kit Productization Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform imnotyourson-photos into a packageable Astro starter kit with centralized config, draft recovery for post creation, and an agent-readable setup guide.

**Architecture:** A single `site.config.ts` at the project root becomes the only file new users edit. All components, layouts, pages, and scripts import from it. The create-post script is converted to TypeScript (run via `tsx`) and gains file-based draft recovery. A setup guide document serves as the primary onboarding path for AI agents helping photographers.

**Tech Stack:** Astro, TypeScript, tsx (dev dependency), Cloudflare Pages/R2

**Spec:** `docs/superpowers/specs/2026-03-17-starter-kit-productization-design.md`

---

## Chunk 1: Foundation — Config, Cleanup, and Wiring

### Task 1: Create feature branch

**Files:** None

- [ ] **Step 1: Create and switch to feature branch**

```bash
git checkout -b feature/starter-kit-productization
```

- [ ] **Step 2: Verify branch**

```bash
git branch --show-current
```

Expected: `feature/starter-kit-productization`

---

### Task 2: Create config type and site config file

**Files:**
- Create: `src/types/config.ts`
- Create: `site.config.ts`

- [ ] **Step 1: Create the type definition**

Create `src/types/config.ts`:

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

- [ ] **Step 2: Create the site config file**

Create `site.config.ts` at project root:

```ts
import type { SiteConfig } from './src/types/config';

export default {
  site: {
    name: "imnotyourson",
    url: "https://photos.imnotyourson.com",
    author: "imnotyourson",
    description: "Photography blog by imnotyourson",
    tagline: "It was me, I let the dogs out.",
  },
  cloudflare: {
    r2PublicUrl: "https://images.imnotyourson.com",
    r2BucketName: "imnotyourson-photos",
    analyticsId: "80523abe324f43358c588361d782f564",
    googleAnalyticsId: "G-Q28HEXYGM4",
  },
  navigation: [
    { label: "archive", href: "/archive" },
  ],
} satisfies SiteConfig;
```

Note: The values above are the current hardcoded values from the existing codebase. This preserves existing behavior while making everything configurable.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/saiday/projects/imnotyourson-photos && npx tsc --noEmit site.config.ts --esModuleInterop --moduleResolution bundler --module ESNext
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/config.ts site.config.ts
git commit -m "Add site config type and centralized config file"
```

---

### Task 3: Delete unused boilerplate files

**Files:**
- Delete: `src/layouts/Layout.astro`
- Delete: `src/components/Welcome.astro`

- [ ] **Step 1: Verify files are not imported anywhere**

```bash
cd /Users/saiday/projects/imnotyourson-photos && grep -r "Layout.astro\|Welcome.astro" src/ --include="*.astro" --include="*.ts" --include="*.mjs" | grep -v "BaseLayout\|PostLayout"
```

Expected: No output (no imports found).

- [ ] **Step 2: Delete the files**

```bash
rm src/layouts/Layout.astro src/components/Welcome.astro
```

- [ ] **Step 3: Commit**

```bash
git add -u src/layouts/Layout.astro src/components/Welcome.astro
git commit -m "Remove unused Astro boilerplate files"
```

---

### Task 4: Wire config into astro.config.mjs

**Files:**
- Modify: `astro.config.mjs`

- [ ] **Step 1: Update astro.config.mjs to import from config**

Replace the entire file content with:

```js
// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';
import siteConfig from './site.config.ts';

// https://astro.build/config
export default defineConfig({
  site: siteConfig.site.url,
  output: 'server',
  adapter: cloudflare({
    mode: 'directory',
    imageService: 'cloudflare'
  })
});
```

- [ ] **Step 2: Verify build still works**

```bash
cd /Users/saiday/projects/imnotyourson-photos && npm run build
```

Expected: Build completes successfully.

- [ ] **Step 3: Commit**

```bash
git add astro.config.mjs
git commit -m "Wire astro config to read site URL from site.config.ts"
```

---

### Task 5: Wire config into src/utils/images.ts

**Files:**
- Modify: `src/utils/images.ts`

- [ ] **Step 1: Replace env var import with config import**

In `src/utils/images.ts`, replace line 12:

```ts
const R2_PUBLIC_URL = import.meta.env.PUBLIC_R2_URL || 'https://photos.imnotyourson.com';
```

with:

```ts
import siteConfig from '../../site.config';
```

And add after the `RESPONSIVE_WIDTHS` line:

```ts
const R2_PUBLIC_URL = siteConfig.cloudflare.r2PublicUrl;
```

The final top of the file should look like:

```ts
/**
 * Image transformation utilities for Cloudflare Image Transformations
 *
 * CRITICAL: Uses fixed responsive widths (960, 1440, 1920) to control
 * Cloudflare Transformations quota (5,000 unique transformations/month on Free tier)
 */

import siteConfig from '../../site.config';

// Fixed responsive widths to control transformation quota
export const RESPONSIVE_WIDTHS = [960, 1440, 1920] as const;

// Get R2 public URL from site config
const R2_PUBLIC_URL = siteConfig.cloudflare.r2PublicUrl;
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/saiday/projects/imnotyourson-photos && npm run build
```

Expected: Build completes successfully.

- [ ] **Step 3: Commit**

```bash
git add src/utils/images.ts
git commit -m "Wire images utility to read R2 URL from site config"
```

---

### Task 6: Wire config into BaseLayout.astro (analytics conditional rendering)

**Files:**
- Modify: `src/layouts/BaseLayout.astro`

- [ ] **Step 1: Add config import and replace hardcoded site title**

In the frontmatter section of `src/layouts/BaseLayout.astro`, add after the existing imports:

```ts
import siteConfig from '../../site.config';
```

Replace line 20:

```ts
const siteTitle = 'imnotyourson photos';
```

with:

```ts
const siteTitle = siteConfig.site.name;
```

- [ ] **Step 2: Replace hardcoded analytics with conditional rendering**

Replace lines 72-82 (the Google Analytics and Cloudflare Web Analytics script blocks):

```html
    <!-- Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-Q28HEXYGM4"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-Q28HEXYGM4');
    </script>

    <!-- Cloudflare Web Analytics -->
    <script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "80523abe324f43358c588361d782f564"}'></script>
```

with:

```html
    {siteConfig.cloudflare.googleAnalyticsId && (
      <>
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${siteConfig.cloudflare.googleAnalyticsId}`}></script>
        <script define:vars={{ gaId: siteConfig.cloudflare.googleAnalyticsId }}>
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', gaId);
        </script>
      </>
    )}

    {siteConfig.cloudflare.analyticsId && (
      <script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon={`{"token": "${siteConfig.cloudflare.analyticsId}"}`}></script>
    )}
```

- [ ] **Step 3: Verify build**

```bash
cd /Users/saiday/projects/imnotyourson-photos && npm run build
```

Expected: Build completes successfully.

- [ ] **Step 4: Commit**

```bash
git add src/layouts/BaseLayout.astro
git commit -m "Wire BaseLayout to read site name and analytics from config"
```

---

### Task 7: Wire config into Header.astro (site name + navigation)

**Files:**
- Modify: `src/components/Header.astro`

- [ ] **Step 1: Add config import, site name, and navigation rendering**

Replace the entire `src/components/Header.astro` content with:

```astro
---
import siteConfig from '../../site.config';
---

<header class="site-header">
  <div class="container">
    <a href="/" class="site-title">{siteConfig.site.name}</a>
    {siteConfig.navigation.length > 0 && (
      <nav class="site-nav">
        {siteConfig.navigation.map(link => (
          <a href={link.href} class="nav-link">{link.label}</a>
        ))}
      </nav>
    )}
  </div>
</header>

<style>
  .site-header {
    padding: 1.5rem 0;
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .site-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: #DDDBD9;
    text-decoration: none;
  }

  .site-title:hover {
    text-decoration: none;
    opacity: 0.7;
  }

  .site-nav {
    display: flex;
    gap: 2rem;
  }

  .nav-link {
    color: var(--color-text-muted);
    text-decoration: none;
    font-size: 1rem;
    transition: color 0.2s ease;
  }

  .nav-link:hover {
    color: var(--color-text);
    text-decoration: none;
  }

  .nav-link.active {
    color: var(--color-text);
  }
</style>
```

This adds navigation link rendering using the existing CSS classes that were previously unused.

- [ ] **Step 2: Verify build**

```bash
cd /Users/saiday/projects/imnotyourson-photos && npm run build
```

Expected: Build completes successfully.

- [ ] **Step 3: Verify visually**

```bash
cd /Users/saiday/projects/imnotyourson-photos && npm run dev
```

Open http://localhost:4321 — verify the header shows the site name and an "archive" navigation link.

- [ ] **Step 4: Commit**

```bash
git add src/components/Header.astro
git commit -m "Wire Header to read site name and navigation from config"
```

---

### Task 8: Wire config into index.astro (site name + tagline)

**Files:**
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Add config import and replace hardcoded values**

In `src/pages/index.astro`, add after the existing imports in the frontmatter:

```ts
import siteConfig from '../../site.config';
```

Replace lines 22-23:

```ts
const title = 'imnotyourson';
const description = 'It was me, I let the dogs out.';
```

with:

```ts
const title = siteConfig.site.name;
const description = siteConfig.site.tagline;
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/saiday/projects/imnotyourson-photos && npm run build
```

Expected: Build completes successfully.

- [ ] **Step 3: Commit**

```bash
git add src/pages/index.astro
git commit -m "Wire homepage to read site name and tagline from config"
```

---

### Task 8b: Wire config into PostLayout.astro

**Files:**
- Modify: `src/layouts/PostLayout.astro`

Note: `PostLayout.astro` does not directly hardcode a site name — it passes `title` to `BaseLayout` which now reads from config. However, for consistency and to make it independent of `BaseLayout` internals, we still don't need to change it. No hardcoded values exist in this file. **No changes needed — this task is a verification-only step.**

- [ ] **Step 1: Verify PostLayout has no hardcoded site-specific values**

```bash
cd /Users/saiday/projects/imnotyourson-photos && grep -n "imnotyourson" src/layouts/PostLayout.astro
```

Expected: No matches. The file delegates site name to `BaseLayout` which already reads from config.

---

### Task 9: Wire config into rss.xml.ts

**Files:**
- Modify: `src/pages/rss.xml.ts`

- [ ] **Step 1: Add config import and replace hardcoded values**

Replace the entire `src/pages/rss.xml.ts` with:

```ts
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import siteConfig from '../../site.config';

export async function GET(context: APIContext) {
  const posts = await getCollection('posts');

  // Filter for public posts only and sort by created_at (newest first)
  const publicPosts = posts
    .filter(post => post.data.public === true)
    .sort((a, b) => b.data.created_at.getTime() - a.data.created_at.getTime());

  // Ensure trailing slash for URL construction
  const rawUrl = context.site?.toString() || siteConfig.site.url;
  const siteUrl = rawUrl.endsWith('/') ? rawUrl : `${rawUrl}/`;

  return rss({
    title: siteConfig.site.name,
    description: siteConfig.site.description,
    site: siteUrl,
    items: publicPosts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.created_at,
      description: post.data.description,
      link: `${siteUrl}${post.slug}`,
    })),
    customData: '<language>en-us</language>',
  });
}
```

Note: The unused `getImageUrl` import is also removed since it was not used in this file. Also fixes a pre-existing trailing-slash bug where the fallback URL lacked a trailing slash, producing malformed links like `https://photos.example.comsome-slug`.

- [ ] **Step 2: Verify build**

```bash
cd /Users/saiday/projects/imnotyourson-photos && npm run build
```

Expected: Build completes successfully.

- [ ] **Step 3: Commit**

```bash
git add src/pages/rss.xml.ts
git commit -m "Wire RSS feed to read site metadata from config"
```

---

### Task 10: Wire config into sitemap.xml.ts

**Files:**
- Modify: `src/pages/sitemap.xml.ts`

- [ ] **Step 1: Add config import and replace hardcoded fallback URL**

In `src/pages/sitemap.xml.ts`, add after the existing imports:

```ts
import siteConfig from '../../site.config';
```

Replace line 11:

```ts
  const siteUrl = context.site?.toString() || 'https://photos.imnotyourson.com';
```

with:

```ts
  // Ensure trailing slash for URL construction
  const rawUrl = context.site?.toString() || siteConfig.site.url;
  const siteUrl = rawUrl.endsWith('/') ? rawUrl : `${rawUrl}/`;
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/saiday/projects/imnotyourson-photos && npm run build
```

Expected: Build completes successfully.

- [ ] **Step 3: Commit**

```bash
git add src/pages/sitemap.xml.ts
git commit -m "Wire sitemap to read site URL from config"
```

---

### Task 11: Update .env.example and .gitignore

**Files:**
- Modify: `.env.example`
- Modify: `.gitignore`

- [ ] **Step 1: Update .env.example**

Replace the entire `.env.example` with:

```
# Authentication secrets only — site configuration is in site.config.ts
# No environment variables needed for basic site operation.
# Wrangler authentication is handled via `wrangler login`.
```

- [ ] **Step 2: Add .drafts/ to .gitignore**

Append to `.gitignore`:

```
# Draft recovery files for create-post
.drafts/
```

- [ ] **Step 3: Commit**

```bash
git add .env.example .gitignore
git commit -m "Update .env.example and gitignore for config migration"
```

---

### Task 12: Build verification for Chunk 1

- [ ] **Step 1: Full clean build**

```bash
cd /Users/saiday/projects/imnotyourson-photos && rm -rf dist && npm run build
```

Expected: Build completes with no errors.

- [ ] **Step 2: Verify dev server**

```bash
cd /Users/saiday/projects/imnotyourson-photos && npm run dev
```

Check all pages manually:
- http://localhost:4321 — homepage shows site name from config, tagline, navigation link to archive
- http://localhost:4321/archive — archive page loads
- http://localhost:4321/prague-berlin-in-bw — post page loads with photos
- View page source on homepage — analytics scripts should be present (since config has IDs)
- View page source — no hardcoded "imnotyourson" strings remaining in HTML except as config values

- [ ] **Step 3: Verify no hardcoded values remain**

```bash
cd /Users/saiday/projects/imnotyourson-photos && grep -r "imnotyourson" src/ scripts/ astro.config.mjs --include="*.astro" --include="*.ts" --include="*.mjs" | grep -v "node_modules"
```

Expected: No matches. All instances should now be in `site.config.ts` only.

---

## Chunk 2: Draft Recovery and create-post TypeScript Conversion

### Task 13: Install tsx and convert create-post to TypeScript

**Files:**
- Modify: `package.json`
- Rename: `scripts/create-post.mjs` → `scripts/create-post.ts`

- [ ] **Step 1: Install tsx**

```bash
cd /Users/saiday/projects/imnotyourson-photos && npm install --save-dev tsx
```

- [ ] **Step 2: Rename script file**

```bash
mv scripts/create-post.mjs scripts/create-post.ts
```

- [ ] **Step 3: Update package.json script**

In `package.json`, replace:

```json
"create-post": "node scripts/create-post.mjs"
```

with:

```json
"create-post": "tsx scripts/create-post.ts"
```

- [ ] **Step 4: Update imports in create-post.ts for config**

At the top of `scripts/create-post.ts`, replace line 17:

```ts
const BUCKET_NAME = 'imnotyourson-photos';
```

with:

```ts
import siteConfig from '../site.config.ts';

const BUCKET_NAME = siteConfig.cloudflare.r2BucketName;
```

- [ ] **Step 5: Verify script still runs**

```bash
cd /Users/saiday/projects/imnotyourson-photos && npm run create-post
```

Enter a test slug when prompted, then Ctrl+C to cancel. The script should start without import errors.

- [ ] **Step 6: Commit**

```bash
git add scripts/create-post.ts package.json package-lock.json
git rm scripts/create-post.mjs
git commit -m "Convert create-post to TypeScript with tsx, wire to site config"
```

---

### Task 14: Add draft file management utilities

**Files:**
- Modify: `scripts/create-post.ts`

This task adds the draft read/write/delete functions to the script. The draft logic is added as functions at the top level, then wired into the main workflow in the next task.

- [ ] **Step 1: Add draft type and utility functions**

After the existing constants section in `scripts/create-post.ts` (after `const PROJECT_ROOT = ...`), add:

```ts
// ===== DRAFT RECOVERY =====
const DRAFTS_DIR = path.join(PROJECT_ROOT, '.drafts');

interface DraftImage {
  originalName: string;
  r2Path: string;
  localPath: string;
  width: number;
  height: number;
  size: number;
  status: 'processed' | 'uploaded';
}

interface Draft {
  version: number;
  slug: string;
  created_at: string;
  originalSourceDir: string;
  metadata: {
    title: string;
    description: string;
    imagesSuffix: string;
    showInHomepage: boolean;
    featuredIndex: number;
  };
  images: DraftImage[];
}

async function ensureDraftsDir(): Promise<void> {
  await fs.mkdir(DRAFTS_DIR, { recursive: true });
}

function getDraftPath(slug: string): string {
  return path.join(DRAFTS_DIR, `${slug}.json`);
}

async function readDraft(slug: string): Promise<Draft | null> {
  try {
    const content = await fs.readFile(getDraftPath(slug), 'utf-8');
    return JSON.parse(content) as Draft;
  } catch (error: any) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function writeDraft(draft: Draft): Promise<void> {
  await ensureDraftsDir();
  await fs.writeFile(getDraftPath(draft.slug), JSON.stringify(draft, null, 2), 'utf-8');
}

async function deleteDraft(slug: string): Promise<void> {
  try {
    await fs.unlink(getDraftPath(slug));
  } catch (error: any) {
    if (error.code !== 'ENOENT') throw error;
  }
}

function createDraft(slug: string, metadata: Draft['metadata'], images: DraftImage[], originalSourceDir: string): Draft {
  return {
    version: 1,
    slug,
    created_at: new Date().toISOString(),
    originalSourceDir,
    metadata,
    images,
  };
}
```

- [ ] **Step 2: Verify script still compiles**

```bash
cd /Users/saiday/projects/imnotyourson-photos && npx tsx --eval "import './scripts/create-post.ts'" 2>&1 | head -5
```

This will attempt to run the script (and hit the interactive prompt). If there are syntax/import errors they'll appear. Press Ctrl+C after confirming no compilation errors.

- [ ] **Step 3: Commit**

```bash
git add scripts/create-post.ts
git commit -m "Add draft file management utilities to create-post"
```

---

### Task 15: Wire draft recovery into the main workflow

**Files:**
- Modify: `scripts/create-post.ts`

This is the most complex task. It modifies the `main()` function and `uploadImages()` to use the draft system.

- [ ] **Step 1: Update uploadImages to accept a draft and update per-image status**

Replace the existing `uploadImages` function with:

```ts
async function uploadImages(images: any[], draft: Draft | null): Promise<void> {
  console.log(chalk.cyan(`\nUploading ${images.length} image(s) to R2...\n`));

  for (let i = 0; i < images.length; i++) {
    // Skip already-uploaded images (when resuming)
    if (draft && draft.images[i] && draft.images[i].status === 'uploaded') {
      console.log(chalk.gray(`⊘ Skipping ${i + 1}/${images.length}: ${images[i].r2Path} (already uploaded)`));
      continue;
    }

    const spinner = ora(`Uploading ${i + 1}/${images.length}: ${images[i].r2Path}`).start();

    try {
      await uploadToR2(images[i].localPath, images[i].r2Path);
      spinner.succeed();

      // Update draft to mark image as uploaded
      if (draft) {
        draft.images[i].status = 'uploaded';
        await writeDraft(draft);
      }
    } catch (error: any) {
      spinner.fail();

      // Retry once
      const retrySpinner = ora(`Retrying upload: ${images[i].r2Path}`).start();
      try {
        await uploadToR2(images[i].localPath, images[i].r2Path);
        retrySpinner.succeed();

        if (draft) {
          draft.images[i].status = 'uploaded';
          await writeDraft(draft);
        }
      } catch (retryError: any) {
        retrySpinner.fail();
        throw new Error(`Upload failed after retry: ${retryError.message}`);
      }
    }
  }

  console.log(chalk.green('\n✓ All images uploaded successfully\n'));
}
```

- [ ] **Step 2: Update the main() function to support draft resume**

Replace the `main()` function with:

```ts
async function main() {
  console.log(chalk.blue.bold('\nCreate New Photo Post\n'));

  try {
    // Step 1: Collect metadata
    console.log(chalk.cyan('Post Metadata\n'));

    const title = await input({
      message: 'Post title:',
      validate: (value) => value.trim() !== '' || 'Title cannot be empty'
    });

    const slug = await input({
      message: 'Post slug:',
      validate: validateSlug
    });

    // Step 1.5: Check for existing draft
    let existingDraft = await readDraft(slug);
    let resuming = false;

    if (existingDraft) {
      const uploadedCount = existingDraft.images.filter(img => img.status === 'uploaded').length;
      const totalCount = existingDraft.images.length;

      const shouldResume = await confirm({
        message: `Found a draft for '${existingDraft.metadata.title}' (${uploadedCount}/${totalCount} images uploaded). Resume?`,
        default: true
      });

      if (shouldResume) {
        resuming = true;
        console.log(chalk.cyan('\nResuming from draft...\n'));
      } else {
        const shouldDelete = await confirm({
          message: 'Delete existing draft and start fresh?',
          default: false
        });
        if (shouldDelete) {
          await deleteDraft(slug);
          existingDraft = null;
        } else {
          throw new Error('Post creation cancelled');
        }
      }
    }

    let description: string;
    let imagesSuffix: string;
    let showInHomepage: boolean;
    let images: any[];
    let featuredIndex: number;
    let draft: Draft;
    let sourceDir: string;

    if (resuming && existingDraft) {
      // Restore metadata from draft
      description = existingDraft.metadata.description;
      imagesSuffix = existingDraft.metadata.imagesSuffix;
      showInHomepage = existingDraft.metadata.showInHomepage;
      featuredIndex = existingDraft.metadata.featuredIndex;
      sourceDir = existingDraft.originalSourceDir;

      // Check if temp files still exist for non-uploaded images
      let needsReprocessing = false;
      for (const img of existingDraft.images) {
        if (img.status === 'processed') {
          try {
            await fs.access(img.localPath);
          } catch {
            needsReprocessing = true;
            break;
          }
        }
      }

      if (needsReprocessing) {
        console.log(chalk.yellow('Some temp files are missing. Re-processing from source directory...\n'));

        // Try original source dir first
        let dirPath = existingDraft.originalSourceDir;
        try {
          await fs.access(dirPath);
        } catch {
          dirPath = await input({
            message: 'Original source directory unavailable. Provide new path:',
            validate: async (value) => {
              try {
                const expandedPath = value.replace(/^~/, process.env.HOME || '');
                const stats = await fs.stat(expandedPath);
                return stats.isDirectory() || 'Path must be a directory';
              } catch {
                return 'Invalid path';
              }
            }
          });
          dirPath = dirPath.replace(/^~/, process.env.HOME || '');
          sourceDir = dirPath;
        }

        // Re-process only non-uploaded images
        tempDir = `/tmp/create-post-${randomUUID()}`;
        await fs.mkdir(tempDir, { recursive: true });

        for (const img of existingDraft.images) {
          if (img.status === 'uploaded') continue;

          const sourcePath = path.join(dirPath, img.originalName);
          const { buffer } = await readImageFromPath(sourcePath);
          const tempPath = path.join(tempDir, path.basename(img.r2Path));
          await fs.writeFile(tempPath, buffer);
          img.localPath = tempPath;
        }
      }

      images = existingDraft.images.map(img => ({
        localPath: img.localPath,
        r2Path: img.r2Path,
        size: img.size,
        width: img.width,
        height: img.height,
      }));

      draft = existingDraft;
    } else {
      // Normal flow: collect all metadata
      description = await editor({
        message: 'Post description (opens editor):',
        default: '',
        waitForUseInput: false
      });

      imagesSuffix = await input({
        message: 'Images directory suffix:',
        validate: validateSlug
      });

      showInHomepage = await confirm({
        message: 'Show in homepage carousel?',
        default: true
      });

      // Collect images (collectImages returns sourceDir — see Step 2b below)
      const result = await collectImages(imagesSuffix);
      images = result.images;
      featuredIndex = result.featuredIndex;
      sourceDir = result.sourceDir;

      if (images.length === 0) {
        throw new Error('No images added. At least one image is required.');
      }

      console.log(chalk.gray(`\nTotal: ${images.length} image(s), ${formatBytes(images.reduce((sum, img) => sum + img.size, 0))}\n`));

      // Create draft before upload
      const draftImages: DraftImage[] = images.map(img => ({
        originalName: path.basename(img.localPath),
        r2Path: img.r2Path,
        localPath: img.localPath,
        width: img.width,
        height: img.height,
        size: img.size,
        status: 'processed' as const,
      }));

      draft = createDraft(slug, {
        title,
        description,
        imagesSuffix,
        showInHomepage,
        featuredIndex,
      }, draftImages, sourceDir);

      await writeDraft(draft);
      console.log(chalk.gray(`Draft saved to .drafts/${slug}.json\n`));
    }

    // Confirm before upload
    const pendingCount = draft.images.filter(img => img.status !== 'uploaded').length;
    if (pendingCount > 0) {
      const proceedUpload = await confirm({
        message: `Upload ${pendingCount} image(s) to R2?`,
        default: true
      });
      if (!proceedUpload) {
        console.log(chalk.gray('Upload skipped. Draft preserved for later resume.\n'));
        return;
      }

      // Upload to R2
      await uploadImages(images, draft);
    } else {
      console.log(chalk.green('All images already uploaded.\n'));
    }

    // Generate markdown
    console.log(chalk.cyan('Generating post file...\n'));
    const markdown = generateMarkdown(title, description, images, images[draft.metadata.featuredIndex].r2Path, showInHomepage);
    const postPath = await writePostFile(slug, markdown);

    // Git commit and push
    await gitCommitAndPush(postPath, title);

    // Delete draft on success
    await deleteDraft(slug);

    // Success!
    console.log(chalk.green.bold('✓ Post created successfully!\n'));
    console.log(chalk.gray(`View at: http://localhost:4321/${slug}\n`));

  } catch (error: any) {
    if (error.message === 'User force closed the prompt' || error.message === 'ExitPromptError') {
      console.log(chalk.yellow('\n✗ Cancelled by user\n'));
    } else {
      console.error(chalk.red('\n✗ Error:'), error.message, '\n');
    }
    process.exit(1);
  } finally {
    await cleanupTempDir();
  }
}
```

- [ ] **Step 2b: Update collectImages to return sourceDir**

The `collectImages` function needs to return the source directory path so it can be stored in the draft. Update the return statement at the end of `collectImages`:

Change:
```ts
    return { images, featuredIndex: parseInt(featuredIndex, 10) - 1 };
```

to:
```ts
    const expandedDirPath = dirPath.trim().replace(/^~/, process.env.HOME || '');
    return { images, featuredIndex: parseInt(featuredIndex, 10) - 1, sourceDir: expandedDirPath };
```

- [ ] **Step 3: Verify the script compiles**

```bash
cd /Users/saiday/projects/imnotyourson-photos && npx tsx --eval "import './scripts/create-post.ts'" 2>&1 | head -5
```

Press Ctrl+C after confirming no errors.

- [ ] **Step 5: Commit**

```bash
git add scripts/create-post.ts
git commit -m "Add draft recovery to create-post workflow"
```

---

## Chunk 3: Setup Guide and Final Verification

### Task 16: Write the agent-readable setup guide

**Files:**
- Create: `docs/setup-guide.md`

- [ ] **Step 1: Write the setup guide**

Create `docs/setup-guide.md` with the following content:

```markdown
# Setup Guide

## For the Photographer

This is a photography blog you fully own and control — your photos, your domain, no platform fees. It runs on Cloudflare, chosen for its generous free tier (enough for most photography sites at zero cost), global CDN that ensures fast loading for large photos anywhere in the world, and built-in image transformations that automatically resize and optimize your photos without any manual work.

**If you're not a tech person**, find an AI coding agent (Claude Code, Cursor, Copilot, etc.) and point it at this guide. It will know how to set up everything for you.

---

## For the Agent

The sections below are written for you to execute on behalf of the photographer. Each step includes what to do, why it matters, and how to verify it worked.

### 1. Prerequisites

Verify or install the following:

- **Node.js** (v18 or later): https://nodejs.org/
  - Verify: `node --version` should output `v18.x.x` or higher
- **Git**: https://git-scm.com/
  - Verify: `git --version`
- **Wrangler CLI** (Cloudflare's CLI tool):
  - Install: `npm install -g wrangler`
  - Verify: `wrangler --version`

### 2. Cloudflare Account Setup

The photographer needs a Cloudflare account. Guide them through this at https://dash.cloudflare.com/sign-up.

**Why Cloudflare?**
- R2 storage has zero egress fees — serving photos costs nothing beyond storage
- Global CDN means photos load fast worldwide, even large high-resolution images
- Image Transformations automatically resize and convert to modern formats (WebP/AVIF) — no build step needed
- Free tier covers: 10GB storage, 10M reads/month, 5K image transformations/month

#### 2.1 Enable R2 Storage

1. In Cloudflare dashboard, go to **R2 Object Storage**
2. If prompted, complete the sign-up for R2 (requires adding a payment method, but free tier covers most usage)
3. Verify: The R2 overview page loads without errors

#### 2.2 Create R2 Bucket

1. Click **Create bucket**
2. Name it something descriptive (e.g., `my-photo-blog` or the photographer's site name, lowercase with hyphens)
3. Choose **Automatic** for location (Cloudflare optimizes placement)
4. Verify: Bucket appears in the R2 dashboard

Remember this bucket name — it goes in `site.config.ts`.

#### 2.3 Configure Custom Domain for R2

This is required for proper caching and to avoid rate limits.

1. In the bucket settings, go to **Settings** > **Public access** > **Custom Domains**
2. Add a subdomain like `images.yourdomain.com`
3. Cloudflare will configure DNS automatically if the domain is on Cloudflare
4. Verify: `curl -I https://images.yourdomain.com` returns a response (may be 404 for empty bucket, that's fine)

Remember this URL — it goes in `site.config.ts` as `r2PublicUrl`.

#### 2.4 Enable Image Transformations

1. In Cloudflare dashboard, go to **Images** > **Transformations**
2. Enable transformations for the zone (domain) where the site will be hosted
3. Verify: The transformations page shows "Enabled"

**Why:** This allows the site to serve optimally-sized images via URL parameters (`/cdn-cgi/image/width=960,...`) without any build-time processing.

#### 2.5 Set Up Cloudflare Pages

1. In Cloudflare dashboard, go to **Workers & Pages** > **Create**
2. Select **Pages** > **Connect to Git**
3. Authorize Cloudflare to access the repository
4. Configure build settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Node.js version:** Set environment variable `NODE_VERSION` = `18` (or later)
5. Deploy
6. Verify: The Pages project appears in the dashboard

### 3. Project Setup

#### 3.1 Clone the Repository

```bash
git clone <repository-url>
cd <project-directory>
npm install
```

#### 3.2 Edit site.config.ts

Open `site.config.ts` at the project root. Update every field:

```ts
export default {
  site: {
    name: "...",          // Site name shown in header and page titles
    url: "https://...",   // Full production URL (must match Cloudflare Pages domain)
    author: "...",        // Your name, used in RSS feed
    description: "...",   // Site description for search engines and RSS
    tagline: "...",       // Short line displayed on the homepage
  },
  cloudflare: {
    r2PublicUrl: "https://images.yourdomain.com",  // Custom domain from step 2.3
    r2BucketName: "your-bucket-name",               // Bucket name from step 2.2
    analyticsId: "",          // Cloudflare Web Analytics token (optional, leave empty to skip)
    googleAnalyticsId: "",    // Google Analytics measurement ID (optional, leave empty to skip)
  },
  navigation: [
    { label: "archive", href: "/archive" },
    // Add more links here if needed
  ],
} satisfies SiteConfig;
```

#### 3.3 Authenticate Wrangler

```bash
wrangler login
```

This opens a browser for Cloudflare authentication. The photographer needs to approve access.

Verify: `wrangler whoami` shows the correct account.

**For CI/CD or non-interactive environments:** Generate an API token instead at https://dash.cloudflare.com/profile/api-tokens. The token needs permissions: Account > Cloudflare Pages > Edit, Account > R2 > Edit.

#### 3.4 Build and Deploy

```bash
npm run build
```

Verify: No errors. The `dist/` directory is created.

For manual deployment:
```bash
npm run deploy
```

For automatic deployment: push to the connected Git repository — Cloudflare Pages builds and deploys automatically.

Verify: The live site loads at the configured URL.

### 4. Creating Your First Post

1. Put your photos (JPEG, PNG, or WebP) into a single folder
2. Run: `npm run create-post`
3. Follow the prompts:
   - **Post title** — name of the photo essay
   - **Post slug** — URL-friendly name (lowercase, hyphens, e.g., `autumn-in-tokyo`)
   - **Description** — short text about the photos (opens your text editor)
   - **Images directory suffix** — folder name in R2 storage (usually same as slug)
   - **Show in homepage** — whether to feature on the front page
   - **Image directory path** — path to the folder with your photos
   - **Image order** — reorder if needed (e.g., `3,1,2`)
   - **Featured photo** — which photo represents this post (used in social media previews)
4. The script uploads photos to R2, generates the post file, and commits to Git
5. Push to deploy: `git push` (if not already pushed by the script)
6. Verify: Visit `https://yoursite.com/<slug>` to see the post

**If the script fails mid-upload:** Just run `npm run create-post` again with the same slug. It will detect the draft and offer to resume from where it stopped.

### 5. Customization

The site is built with [Astro](https://astro.build/), a modern static site framework. All visual customization is done by editing component files directly.

| File | Controls |
|------|----------|
| `site.config.ts` | Site identity, Cloudflare settings, navigation links |
| `src/layouts/BaseLayout.astro` | HTML shell, global CSS styles, meta tags |
| `src/layouts/PostLayout.astro` | Blog post page structure |
| `src/components/Header.astro` | Site header and navigation bar |
| `src/components/PhotoGrid.astro` | Photo gallery grid and lightbox viewer |
| `src/pages/index.astro` | Homepage layout |
| `src/pages/archive/index.astro` | Archive page layout |

For deeper customization, refer to:
- [Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Astro styling](https://docs.astro.build/en/guides/styling/)
- [Astro routing](https://docs.astro.build/en/guides/routing/)

### 6. Ongoing Maintenance

- **Update dependencies:** `npm update` periodically, then `npm run build` to verify, then deploy
- **Monitor usage:** Check the Cloudflare dashboard for R2 storage, read operations, and image transformation counts
- **Analytics:** Edit `site.config.ts` — set analytics IDs to empty strings to disable, or add new IDs to enable
```

- [ ] **Step 2: Commit**

```bash
git add docs/setup-guide.md
git commit -m "Add agent-readable setup guide for photographers"
```

---

### Task 17: Final verification

- [ ] **Step 1: Clean build**

```bash
cd /Users/saiday/projects/imnotyourson-photos && rm -rf dist && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 2: Dev server smoke test**

```bash
cd /Users/saiday/projects/imnotyourson-photos && npm run dev
```

Verify all pages at localhost:4321:
- Homepage: site name from config, tagline, navigation link, featured photos
- Archive: posts listed
- Post pages: photos load in grid, lightbox works
- RSS (`/rss.xml`): contains site name from config
- Sitemap (`/sitemap.xml`): contains correct site URL

- [ ] **Step 3: Verify config is the single source of truth**

```bash
cd /Users/saiday/projects/imnotyourson-photos && grep -rn "imnotyourson" src/ astro.config.mjs scripts/ --include="*.astro" --include="*.ts" --include="*.mjs" | grep -v node_modules
```

Expected: No matches. The string should only appear in `site.config.ts`.

- [ ] **Step 4: Verify create-post script starts**

```bash
cd /Users/saiday/projects/imnotyourson-photos && npm run create-post
```

Confirm the script prompts for title without errors. Ctrl+C to exit.

- [ ] **Step 5: Review all commits on the branch**

```bash
git log --oneline main..feature/starter-kit-productization
```

Verify the commit history is clean and logical.
