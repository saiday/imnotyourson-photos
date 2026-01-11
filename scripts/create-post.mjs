#!/usr/bin/env node

import { input, confirm, editor } from '@inquirer/prompts';
import chalk from 'chalk';
import { execa } from 'execa';
import simpleGit from 'simple-git';
import fs from 'fs/promises';
import path from 'path';
import { fileTypeFromBuffer } from 'file-type';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import ora from 'ora';
import yaml from 'js-yaml';
import sharp from 'sharp';

// ===== CONSTANTS =====
const BUCKET_NAME = 'imnotyourson-photos';
const POSTS_DIR = 'src/content/posts';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');

let tempDir = null;

// ===== UTILITY FUNCTIONS =====

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function validateSlug(value) {
  if (!value || value.trim() === '') {
    return 'Slug cannot be empty';
  }
  if (!/^[a-z0-9-]+$/.test(value)) {
    return 'Use lowercase letters, numbers, and hyphens only (e.g., "autumn-europe")';
  }
  return true;
}

function sanitizeFilename(filename) {
  // Extract name and extension
  const ext = path.extname(filename).toLowerCase();
  const name = path.basename(filename, ext);

  // Sanitize: lowercase, replace spaces/underscores with hyphens, remove special chars
  const sanitized = name
    .toLowerCase()
    .replace(/[\s_]+/g, '-')           // spaces and underscores → hyphens
    .replace(/[^a-z0-9-]/g, '')        // remove anything not alphanumeric or hyphen
    .replace(/-+/g, '-')               // collapse multiple hyphens
    .replace(/^-|-$/g, '');            // trim leading/trailing hyphens

  // Always use .jpg extension for consistency
  return `${sanitized}.jpg`;
}

async function cleanupTempDir() {
  if (tempDir) {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

// ===== IMAGE COLLECTION =====

async function readImagesFromDirectory(dirPath) {
  // Expand home directory
  const expandedPath = dirPath.replace(/^~/, process.env.HOME);

  // Read directory
  const files = await fs.readdir(expandedPath, { withFileTypes: true });

  // Filter for image files only
  const imageFiles = [];
  for (const file of files) {
    if (!file.isFile()) continue;

    const ext = path.extname(file.name).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) continue;

    imageFiles.push({
      originalName: file.name,
      fullPath: path.join(expandedPath, file.name)
    });
  }

  // Sort alphabetically for consistent display
  imageFiles.sort((a, b) => a.originalName.localeCompare(b.originalName));

  return imageFiles;
}

async function promptImageOrder(imageFiles) {
  console.log(chalk.cyan('\nFound Images:\n'));

  // Display numbered list
  imageFiles.forEach((file, index) => {
    console.log(chalk.gray(`  ${index + 1}. ${file.originalName}`));
  });

  console.log(chalk.gray('\nEnter the order you want (e.g., "1,3,2" or "3,1,2,5,4")'));
  console.log(chalk.gray('Leave blank to use current order\n'));

  const orderInput = await input({
    message: 'Image order:',
    default: '',
    validate: (value) => {
      if (value.trim() === '') return true; // Allow empty for default order

      const indices = value.split(',').map(s => s.trim());
      const nums = indices.map(s => parseInt(s, 10));

      // Check all are valid numbers
      if (nums.some(n => isNaN(n))) {
        return 'All values must be numbers separated by commas';
      }

      // Check all are in valid range
      if (nums.some(n => n < 1 || n > imageFiles.length)) {
        return `Numbers must be between 1 and ${imageFiles.length}`;
      }

      // Check for duplicates
      const uniqueNums = new Set(nums);
      if (uniqueNums.size !== nums.length) {
        return 'Duplicate numbers not allowed';
      }

      return true;
    }
  });

  // If empty, use default order
  if (orderInput.trim() === '') {
    return imageFiles;
  }

  // Reorder based on input
  const indices = orderInput.split(',').map(s => parseInt(s.trim(), 10) - 1);
  return indices.map(i => imageFiles[i]);
}

async function readImageFromPath(imagePath) {
  // Expand home directory if needed
  const expandedPath = imagePath.replace(/^~/, process.env.HOME);

  // Read file
  const buffer = await fs.readFile(expandedPath);

  // Detect file type
  const fileType = await fileTypeFromBuffer(buffer);

  if (!fileType || !['image/jpeg', 'image/png', 'image/webp'].includes(fileType.mime)) {
    throw new Error('Not a valid image format (JPEG, PNG, or WebP)');
  }

  // Extract image dimensions
  const metadata = await sharp(buffer).metadata();

  return {
    buffer,
    ext: fileType.ext,
    mime: fileType.mime,
    originalPath: expandedPath,
    width: metadata.width,
    height: metadata.height
  };
}

async function collectImages(suffix) {
  const images = [];
  tempDir = `/tmp/create-post-${randomUUID()}`;
  await fs.mkdir(tempDir, { recursive: true });

  console.log(chalk.cyan('\nImage Collection'));
  console.log(chalk.gray('Provide a directory path containing your images.\n'));

  // Get directory path
  const dirPath = await input({
    message: 'Image directory path:',
    validate: async (value) => {
      if (value.trim() === '') return 'Path cannot be empty';

      try {
        const expandedPath = value.replace(/^~/, process.env.HOME);
        const stats = await fs.stat(expandedPath);
        if (!stats.isDirectory()) {
          return 'Path must be a directory';
        }
        return true;
      } catch (error) {
        return `Invalid path: ${error.message}`;
      }
    }
  });

  // Read and display images from directory
  const imageFiles = await readImagesFromDirectory(dirPath.trim());

  if (imageFiles.length === 0) {
    throw new Error('No image files found in directory');
  }

  // Let user order the images
  const orderedFiles = await promptImageOrder(imageFiles);

  console.log(chalk.cyan(`\nProcessing ${orderedFiles.length} image(s)...\n`));

  // Track used filenames to handle duplicates
  const usedFilenames = new Set();

  // Process each image
  for (let index = 0; index < orderedFiles.length; index++) {
    const file = orderedFiles[index];

    try {
      const { buffer, ext, mime, originalPath, width, height } = await readImageFromPath(file.fullPath);

      // Sanitize original filename
      const sanitizedFilename = sanitizeFilename(file.originalName);

      // Handle duplicate filenames
      let finalFilename = sanitizedFilename;
      let counter = 2;
      while (usedFilenames.has(finalFilename)) {
        const name = path.basename(sanitizedFilename, '.jpg');
        finalFilename = `${name}-${counter}.jpg`;
        counter++;
      }
      usedFilenames.add(finalFilename);

      const tempPath = path.join(tempDir, finalFilename);
      await fs.writeFile(tempPath, buffer);

      // Track for upload
      images.push({
        localPath: tempPath,
        r2Path: `${suffix}/${finalFilename}`,
        size: buffer.length,
        width,
        height
      });

      console.log(chalk.green(`✓ Image ${index + 1}/${orderedFiles.length}: ${finalFilename} (${mime}, ${formatBytes(buffer.length)}, ${width}×${height})`));
      console.log(chalk.gray(`  Source: ${file.originalName}`));
    } catch (error) {
      console.error(chalk.red(`✗ Failed to process ${file.originalName}: ${error.message}`));

      const continueProcessing = await confirm({
        message: 'Continue with remaining images?',
        default: true
      });

      if (!continueProcessing) {
        throw new Error('Image processing cancelled');
      }
    }
  }

  if (images.length === 0) {
    throw new Error('No images were successfully processed');
  }

  return images;
}

// ===== R2 UPLOAD =====

async function uploadToR2(localPath, r2Path) {
  await execa('npx', [
    'wrangler',
    'r2',
    'object',
    'put',
    `${BUCKET_NAME}/${r2Path}`,
    '--file',
    localPath,
    '--remote'
  ], {
    timeout: 60000,
    cwd: PROJECT_ROOT
  });
}

async function uploadImages(images) {
  console.log(chalk.cyan(`\nUploading ${images.length} image(s) to R2...\n`));

  for (let i = 0; i < images.length; i++) {
    const spinner = ora(`Uploading ${i + 1}/${images.length}: ${images[i].r2Path}`).start();

    try {
      await uploadToR2(images[i].localPath, images[i].r2Path);
      spinner.succeed();
    } catch (error) {
      spinner.fail();

      // Retry once
      const retrySpinner = ora(`Retrying upload: ${images[i].r2Path}`).start();
      try {
        await uploadToR2(images[i].localPath, images[i].r2Path);
        retrySpinner.succeed();
      } catch (retryError) {
        retrySpinner.fail();
        throw new Error(`Upload failed after retry: ${retryError.message}`);
      }
    }
  }

  console.log(chalk.green('\n✓ All images uploaded successfully\n'));
}

// ===== MARKDOWN GENERATION =====

function generateMarkdown(title, description, photos, featuredPhoto, showInHomepage) {
  const frontmatter = {
    title,
    description,
    public: true,
    created_at: new Date().toISOString(),
    photos: photos.map(photo => ({
      filename: photo.r2Path,
      width: photo.width,
      height: photo.height
    })),
    featured_photo: featuredPhoto,
    show_in_homepage: showInHomepage
  };

  const yamlString = yaml.dump(frontmatter, {
    lineWidth: -1,
    quotingType: '"',
    forceQuotes: true
  });

  return `---\n${yamlString}---\n\n${description}\n`;
}

async function writePostFile(slug, markdown) {
  const filePath = path.join(PROJECT_ROOT, POSTS_DIR, `${slug}.md`);

  // Check if exists
  try {
    await fs.access(filePath);
    const overwrite = await confirm({
      message: `Post ${slug}.md already exists. Overwrite?`,
      default: false
    });
    if (!overwrite) {
      throw new Error('Post creation cancelled');
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
    // File doesn't exist, continue
  }

  await fs.writeFile(filePath, markdown, 'utf-8');
  console.log(chalk.green(`✓ Created ${filePath}\n`));

  return filePath;
}

// ===== GIT OPERATIONS =====

async function gitCommitAndPush(postPath, title) {
  const git = simpleGit(PROJECT_ROOT);

  console.log(chalk.cyan('Git Operations\n'));

  // Check status and branch
  const status = await git.status();
  const currentBranch = status.current;

  if (currentBranch !== 'main') {
    console.log(chalk.yellow(`⚠ On branch '${currentBranch}' (not main)\n`));
  }

  // Confirm before proceeding
  const proceed = await confirm({
    message: 'Commit and push to remote?',
    default: true
  });
  if (!proceed) {
    console.log(chalk.gray('Skipped git operations'));
    return;
  }

  // Add, commit, push
  const spinner = ora('Committing changes').start();
  try {
    await git.add(postPath);
    await git.commit(`Add post: ${title}\n\nCo-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>`);
    spinner.succeed('Committed changes');

    const pushSpinner = ora(`Pushing to origin/${currentBranch}`).start();
    await git.push('origin', currentBranch);
    pushSpinner.succeed(`Pushed to origin/${currentBranch}`);
  } catch (error) {
    spinner.fail();
    throw new Error(`Git operation failed: ${error.message}`);
  }

  console.log(chalk.green('\n✓ Changes pushed to remote\n'));
}

// ===== MAIN WORKFLOW =====

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

    const description = await editor({
      message: 'Post description (opens editor):',
      default: '',
      waitForUseInput: false
    });

    const imagesSuffix = await input({
      message: 'Images directory suffix:',
      validate: validateSlug
    });

    const showInHomepage = await confirm({
      message: 'Show in homepage carousel?',
      default: true
    });

    // Step 2: Collect images from directory
    const images = await collectImages(imagesSuffix);
    if (images.length === 0) {
      throw new Error('No images added. At least one image is required.');
    }

    console.log(chalk.gray(`\nTotal: ${images.length} image(s), ${formatBytes(images.reduce((sum, img) => sum + img.size, 0))}\n`));

    // Confirm before upload
    const proceedUpload = await confirm({
      message: `Upload ${images.length} image(s) to R2?`,
      default: true
    });
    if (!proceedUpload) {
      throw new Error('Upload cancelled');
    }

    // Step 3: Upload to R2
    await uploadImages(images);

    // Step 4: Generate markdown
    console.log(chalk.cyan('Generating post file...\n'));
    const markdown = generateMarkdown(title, description, images, images[0].r2Path, showInHomepage);
    const postPath = await writePostFile(slug, markdown);

    // Step 5: Git commit and push
    await gitCommitAndPush(postPath, title);

    // Success!
    console.log(chalk.green.bold('✓ Post created successfully!\n'));
    console.log(chalk.gray(`View at: http://localhost:4321/${slug}\n`));

  } catch (error) {
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

// Cleanup on exit
process.on('exit', () => {
  cleanupTempDir();
});

process.on('SIGINT', () => {
  cleanupTempDir();
  process.exit(130);
});

main();
