#!/usr/bin/env node

/**
 * Backfill WebP variants for existing posts.
 *
 * Reads post frontmatter, downloads originals from R2,
 * generates WebP at each responsive width, uploads back to R2.
 *
 * Usage: node scripts/backfill-webp.mjs
 */

import chalk from 'chalk';
import { execa } from 'execa';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import ora from 'ora';
import yaml from 'js-yaml';
import sharp from 'sharp';

const BUCKET_NAME = 'imnotyourson-photos';
const RESPONSIVE_WIDTHS = [960, 1440, 1920];
const WEBP_QUALITY = 85;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');
const POSTS_DIR = path.join(PROJECT_ROOT, 'src/content/posts');

const tempDir = `/tmp/backfill-webp-${randomUUID()}`;

async function cleanup() {
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch (_) {}
}

async function downloadFromR2(r2Path, localPath) {
  await execa('npx', [
    'wrangler', 'r2', 'object', 'get',
    `${BUCKET_NAME}/${r2Path}`,
    '--file', localPath,
    '--remote',
  ], { timeout: 60000, cwd: PROJECT_ROOT });
}

async function uploadToR2(localPath, r2Path) {
  const contentType = r2Path.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
  await execa('npx', [
    'wrangler', 'r2', 'object', 'put',
    `${BUCKET_NAME}/${r2Path}`,
    '--file', localPath,
    '--content-type', contentType,
    '--remote',
  ], { timeout: 60000, cwd: PROJECT_ROOT });
}

async function parsePostFrontmatter(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) throw new Error(`No frontmatter in ${filePath}`);
  return yaml.load(match[1]);
}

async function main() {
  console.log(chalk.blue.bold('\nBackfill WebP Variants\n'));

  await fs.mkdir(tempDir, { recursive: true });

  // Read all posts
  const postFiles = (await fs.readdir(POSTS_DIR)).filter(f => f.endsWith('.md'));
  console.log(chalk.cyan(`Found ${postFiles.length} post(s)\n`));

  let totalProcessed = 0;
  let totalSkipped = 0;

  for (const postFile of postFiles) {
    const frontmatter = await parsePostFrontmatter(path.join(POSTS_DIR, postFile));
    const photos = frontmatter.photos || [];
    console.log(chalk.cyan(`\n${postFile}: ${photos.length} photo(s)`));

    for (const photo of photos) {
      const filename = photo.filename;
      const lastSlash = filename.lastIndexOf('/');
      const dir = filename.substring(0, lastSlash);
      const file = filename.substring(lastSlash + 1);
      const baseName = file.substring(0, file.lastIndexOf('.'));

      // Check if variants already exist by trying the smallest width
      const testR2Path = `${dir}/w${RESPONSIVE_WIDTHS[0]}/${baseName}.webp`;
      const testLocalPath = path.join(tempDir, `test-${randomUUID()}.webp`);
      let alreadyExists = false;
      try {
        await downloadFromR2(testR2Path, testLocalPath);
        alreadyExists = true;
        await fs.unlink(testLocalPath).catch(() => {});
      } catch (_) {
        // Doesn't exist, proceed with generation
      }

      if (alreadyExists) {
        console.log(chalk.gray(`  skip: ${filename} (variants exist)`));
        totalSkipped++;
        continue;
      }

      // Download original
      const originalPath = path.join(tempDir, `original-${randomUUID()}.jpg`);
      const dlSpinner = ora(`  download: ${filename}`).start();
      try {
        await downloadFromR2(filename, originalPath);
        dlSpinner.succeed();
      } catch (error) {
        dlSpinner.fail(`  download failed: ${filename} - ${error.message}`);
        continue;
      }

      // Generate and upload each variant
      for (const width of RESPONSIVE_WIDTHS) {
        const webpPath = path.join(tempDir, `w${width}-${baseName}.webp`);
        const r2Path = `${dir}/w${width}/${baseName}.webp`;

        const spinner = ora(`  generate+upload: w${width}/${baseName}.webp`).start();
        try {
          await sharp(originalPath)
            .resize(width, null, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: WEBP_QUALITY })
            .toFile(webpPath);

          await uploadToR2(webpPath, r2Path);
          const stat = await fs.stat(webpPath);
          spinner.succeed(`  w${width}/${baseName}.webp (${formatBytes(stat.size)})`);
          await fs.unlink(webpPath).catch(() => {});
        } catch (error) {
          spinner.fail(`  w${width} failed: ${error.message}`);
        }
      }

      await fs.unlink(originalPath).catch(() => {});
      totalProcessed++;
    }
  }

  console.log(chalk.green.bold(`\nDone: ${totalProcessed} processed, ${totalSkipped} skipped\n`));
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

process.on('SIGINT', () => { cleanup(); process.exit(130); });
process.on('exit', cleanup);

main().catch(error => {
  console.error(chalk.red('\nError:'), error.message);
  process.exit(1);
}).finally(cleanup);
