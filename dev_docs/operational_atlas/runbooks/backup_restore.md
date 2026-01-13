# Backup and Restore Runbook

Procedures for backing up and restoring site content, images, and configuration.

## Overview

This site has two primary data sources:
1. **Git repository** - Code, content (markdown), configuration
2. **Cloudflare R2** - Original image files

Both require backup strategies to prevent data loss.

## Backup Strategy Summary

| Asset | Primary Storage | Backup Method | Frequency |
|-------|----------------|---------------|-----------|
| Code & content | Git (GitHub) | Git push | Every commit |
| Original images | Cloudflare R2 | Local copies + R2 inventory | Before upload |
| Configuration | Git (GitHub) | Git push | Every change |
| Build artifacts | Cloudflare Pages | None (reproducible) | N/A |

## Git Repository Backup

### Primary Protection

GitHub serves as the primary backup for:
- Source code
- Markdown content files
- Configuration files
- Scripts and automation

**What's NOT in Git:**
- Original image files (too large)
- `.env` files (secrets)
- `node_modules/` (reproducible)
- Build artifacts (`dist/`, `.astro/`)

### Additional Backup Options

**Option 1: Clone to personal storage**

```bash
# Clone repository to external drive or backup location
git clone https://github.com/yourusername/imnotyourson-photos.git /path/to/backup/
```

**Option 2: GitHub repository export**

1. Go to repository Settings
2. Scroll to "Danger Zone"
3. Click "Export repository"
4. Download archive when ready

**Frequency:** Quarterly or before major changes

## R2 Image Backup

### Strategy: Keep Local Copies

The safest R2 backup is keeping original images locally before upload.

**Recommended workflow:**

```bash
# 1. Organize images in dated folders
mkdir -p ~/photo-archives/2026-01-photos-backup/
cp -R /path/to/post-images/* ~/photo-archives/2026-01-photos-backup/

# 2. Upload to R2 via create-post script
npm run create-post

# 3. Verify upload succeeded
npx wrangler r2 object list imnotyourson-photos --remote | grep "filename.jpg"

# 4. Keep local copies as backup (do not delete)
```

### R2 Inventory Export

Regularly export R2 object inventory for disaster recovery reference.

**Monthly inventory export:**

```bash
# Create backups directory
mkdir -p ~/photo-backups/r2-inventories/

# Export object list
npx wrangler r2 object list imnotyourson-photos --remote \
  > ~/photo-backups/r2-inventories/r2-inventory-$(date +%Y-%m-%d).txt

# Example output:
# key: filename.jpg
# uploaded: 2026-01-13T12:00:00.000Z
# size: 2048576
```

**What the inventory provides:**
- Complete list of files in R2
- Upload timestamps
- File sizes
- Useful for identifying missing files

### Downloading from R2 (Selective Restore)

**Download single file:**

```bash
# Download specific image
npx wrangler r2 object get imnotyourson-photos/filename.jpg \
  --file ./restored-filename.jpg \
  --remote
```

**Download multiple files:**

```bash
#!/bin/bash
# download-from-r2.sh
# Download all images from R2 to local directory

BUCKET="imnotyourson-photos"
OUTPUT_DIR="./r2-restore-$(date +%Y-%m-%d)"

mkdir -p "$OUTPUT_DIR"

# Get list of all objects
npx wrangler r2 object list "$BUCKET" --remote | \
  grep "key:" | \
  awk '{print $2}' | \
  while read filename; do
    echo "Downloading $filename..."
    npx wrangler r2 object get "$BUCKET/$filename" \
      --file "$OUTPUT_DIR/$filename" \
      --remote
  done

echo "Download complete. Files saved to: $OUTPUT_DIR"
```

Usage:
```bash
chmod +x download-from-r2.sh
./download-from-r2.sh
```

**Note:** Downloading all files is slow and uses read operations. Only perform full downloads when necessary.

### Third-Party Backup Tools

**Option 1: rclone with R2**

Rclone supports Cloudflare R2 (S3 compatible).

```bash
# Install rclone
brew install rclone  # macOS

# Configure R2 remote
rclone config

# Sync R2 to local directory
rclone sync r2-remote:imnotyourson-photos ~/photo-backups/r2-backup/
```

See rclone documentation: https://rclone.org/s3/#cloudflare-r2

**Option 2: AWS CLI (S3 compatible)**

```bash
# Install AWS CLI
brew install awscli  # macOS

# Configure for R2 (S3 compatible)
aws configure

# Sync bucket
aws s3 sync s3://imnotyourson-photos ~/photo-backups/r2-backup/ \
  --endpoint-url https://[account-id].r2.cloudflarestorage.com
```

Note: Requires R2 access credentials (create in Cloudflare Dashboard).

## Restore Procedures

### Scenario 1: Restore from Git

**Problem:** Accidental code deletion or bad commit

**Solution:**

```bash
# View recent commits
git log --oneline -10

# Restore to specific commit
git checkout [commit-hash]

# Or reset to previous commit (careful!)
git reset --hard HEAD~1

# Or restore specific file
git checkout HEAD~1 -- path/to/file.md
```

### Scenario 2: Restore Missing Image to R2

**Problem:** Image accidentally deleted from R2

**Prerequisites:**
- Local backup of original image
- Or downloaded from R2 backup

**Solution:**

```bash
# Upload image to R2
npx wrangler r2 object put imnotyourson-photos/filename.jpg \
  --file /path/to/local/backup/filename.jpg \
  --remote

# Verify upload
curl -I https://images.imnotyourson.com/filename.jpg
# Should return HTTP/2 200

# Clear Cloudflare cache (if needed)
# Dashboard → Caching → Purge by URL
```

### Scenario 3: Complete R2 Bucket Loss

**Problem:** Entire R2 bucket deleted or corrupted

**Prerequisites:**
- Local backup of all original images
- Or rclone/AWS CLI backup

**Solution:**

```bash
# 1. Recreate bucket
npx wrangler r2 bucket create imnotyourson-photos

# 2. Reconfigure custom domain
npx wrangler r2 bucket domain add imnotyourson-photos \
  --domain photos.imnotyourson.com \
  --zone-id YOUR_ZONE_ID

# 3. Restore from local backup
cd ~/photo-backups/r2-backup/
for file in *.jpg; do
  echo "Uploading $file..."
  npx wrangler r2 object put imnotyourson-photos/$file \
    --file "$file" \
    --remote
done

# 4. Verify restoration
npx wrangler r2 object list imnotyourson-photos --remote | wc -l
# Count should match expected number of images

# 5. Test site
npm run dev
# Visit http://localhost:4321 and check images load
```

### Scenario 4: Restore Configuration Files

**Problem:** Lost `.env` file or other local configuration

**Solution:**

```bash
# 1. Restore environment variables
cp .env.example .env

# 2. Edit with correct values
# PUBLIC_R2_URL=https://images.imnotyourson.com

# 3. Verify Wrangler authentication
npx wrangler whoami

# If not authenticated:
npx wrangler login
```

### Scenario 5: Rebuild from Scratch

**Problem:** Complete local environment loss (new machine)

**Solution:**

```bash
# 1. Clone repository
git clone https://github.com/yourusername/imnotyourson-photos.git
cd imnotyourson-photos

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with correct values

# 4. Authenticate Wrangler
npx wrangler login

# 5. Verify R2 bucket exists
npx wrangler r2 bucket list --remote

# 6. Test local development
npm run dev

# 7. Test build
npm run build

# 8. Deploy if needed
npm run deploy
```

Images should already exist in R2 (no re-upload needed unless bucket was also lost).

## Disaster Recovery Testing

**Recommended:** Test restore procedures annually

**Quarterly test checklist:**

```
[ ] Clone repository to temporary directory
[ ] Install dependencies and build successfully
[ ] Download sample images from R2
[ ] Verify local backup directory is accessible
[ ] Check R2 inventory export is up to date
[ ] Document any issues or outdated procedures
```

## Backup Best Practices

### For Content Authors

1. **Before uploading images:** Keep original files in organized local directory
2. **After upload:** Verify images appear on site before deleting local copies
3. **Monthly:** Export R2 inventory to document uploaded files
4. **Quarterly:** Backup entire local archive to external drive

### For Developers

1. **Commit frequently:** Push code changes to GitHub regularly
2. **Document changes:** Write clear commit messages
3. **Test restores:** Periodically test backup restore procedures
4. **Update runbooks:** Keep this document updated with process changes

## Cloudflare R2 Durability

**Note:** Cloudflare R2 has built-in redundancy and durability:
- Objects automatically replicated across multiple data centers
- 99.999999999% (11 nines) durability SLA
- No user action required for R2's internal redundancy

However, this does NOT protect against:
- Accidental deletion by user
- Account compromise or malicious deletion
- Billing issues causing service suspension

Therefore, local backups remain critical.

## Backup Storage Recommendations

**Local backup locations:**
- External hard drive (2+ TB recommended)
- NAS (Network Attached Storage)
- Time Machine (macOS) or File History (Windows)

**Cloud backup locations:**
- Personal cloud storage (Dropbox, Google Drive, iCloud)
- Second Cloudflare account (R2 in different account)
- AWS S3 (if using multi-cloud strategy)

**Minimum recommendation:**
- Keep local copies until post is published and verified
- Monthly R2 inventory exports
- Quarterly full local backup to external drive

## Related Documentation

- `dev_docs/r2_setup_guide.md` - R2 configuration and upload workflows
- `dev_docs/operational_atlas/runbooks/quota_monitoring.md` - Quota monitoring
- `README.md` - General setup and troubleshooting

## Support

For R2 issues:
- Cloudflare R2 documentation: https://developers.cloudflare.com/r2/
- Cloudflare Community: https://community.cloudflare.com/
- Cloudflare Support: https://dash.cloudflare.com/?to=/:account/support

For Git issues:
- GitHub documentation: https://docs.github.com/
- Git documentation: https://git-scm.com/doc
