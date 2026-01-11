# R2 Setup Guide — imnotyourson-photos

Complete guide for setting up Cloudflare R2 storage and image transformations.

## Prerequisites

- Cloudflare account with R2 enabled
- Domain added to Cloudflare (`imnotyourson.com`)
- Wrangler CLI authenticated (`npx wrangler whoami`)

## Step 1: Enable R2

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your account
3. Click "R2 Object Storage" in the left sidebar
4. Click "Begin Setup" or "Get Started"
5. Accept the terms of service

## Step 2: Create R2 Bucket

```bash
npx wrangler r2 bucket create imnotyourson-photos
```

**Expected output:**
```
✅ Created bucket 'imnotyourson-photos' with default storage class of Standard.
```

## Step 3: Configure Custom Domain

Get your Zone ID:
1. Go to Cloudflare Dashboard
2. Click on `imnotyourson.com` domain
3. Scroll down on the right sidebar - copy the "Zone ID"

```bash
npx wrangler r2 bucket domain add imnotyourson-photos \
  --domain photos.imnotyourson.com \
  --zone-id YOUR_ZONE_ID
```

**Expected output:**
```
✨ Custom domain 'photos.imnotyourson.com' connected successfully.
```

## Step 4: Enable Image Transformations

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select `imnotyourson.com` domain
3. In the left sidebar, go to "Speed" → "Optimization"
4. Scroll to "Image Optimization" section
5. Toggle "Image Resizing" to **ON**

This enables the `/cdn-cgi/image/` transformation endpoints.

## Step 5: Upload Photos to R2

**Upload single file:**
```bash
npx wrangler r2 object put imnotyourson-photos/filename.jpg \
  --file "/path/to/local/photo.jpg" \
  --remote
```

**Important:** Always use `--remote` flag to upload to cloud bucket (not local miniflare).

**Verify upload:**
```bash
# Check if file is accessible
curl -I https://photos.imnotyourson.com/filename.jpg

# Should return HTTP/2 200
```

## Step 6: Test Image Transformations

```bash
# Test transformation
curl -I "https://photos.imnotyourson.com/cdn-cgi/image/width=960,format=auto/filename.jpg"

# Should return HTTP/2 200 with smaller content-length
```

## Environment Configuration

Update `.env` file:
```env
PUBLIC_R2_URL=https://photos.imnotyourson.com
```

Update `.env.example` for reference:
```env
PUBLIC_R2_URL=https://photos.imnotyourson.com
```

## Uploading Photos for New Posts

### Workflow

1. **Prepare photos**
   - Use descriptive filenames (e.g., `berlin-sunset-001.jpg`)
   - Keep originals (no need to resize locally)
   - Recommended: compress to reasonable size before upload (1-5MB each)

2. **Upload to R2**
   ```bash
   # Upload all photos for a post
   npx wrangler r2 object put imnotyourson-photos/berlin-sunset-001.jpg --file ./photos/berlin-sunset-001.jpg --remote
   npx wrangler r2 object put imnotyourson-photos/berlin-sunset-002.jpg --file ./photos/berlin-sunset-002.jpg --remote
   # ... etc
   ```

3. **Create post frontmatter**
   In `src/content/posts/my-post.md`:
   ```yaml
   ---
   title: "Berlin Sunset"
   description: "..."
   public: true
   created_at: 2026-01-15T00:00:00.000Z
   photos:
     - filename: "berlin-sunset-001.jpg"
       alt: "Description of photo 1"
     - filename: "berlin-sunset-002.jpg"
       alt: "Description of photo 2"
   featured_photo: "berlin-sunset-001.jpg"
   ---
   ```

4. **Test locally**
   ```bash
   npm run dev
   # Visit http://localhost:4321/posts/my-post
   ```

## Batch Upload Script (Future Enhancement)

For uploading multiple photos at once, consider creating a script:

```bash
#!/bin/bash
# upload-photos.sh

BUCKET="imnotyourson-photos"
PHOTOS_DIR="$1"

for file in "$PHOTOS_DIR"/*.jpg; do
  filename=$(basename "$file")
  echo "Uploading $filename..."
  npx wrangler r2 object put "$BUCKET/$filename" --file "$file" --remote
done

echo "Upload complete!"
```

Usage:
```bash
chmod +x upload-photos.sh
./upload-photos.sh ./my-photo-folder
```

## Troubleshooting

### Images return 404

**Issue:** `https://photos.imnotyourson.com/photo.jpg` returns 404

**Solutions:**
1. Verify upload used `--remote` flag
2. Check bucket name matches: `npx wrangler r2 bucket list --remote`
3. List objects in bucket: `npx wrangler r2 object list imnotyourson-photos --remote`

### Image transformations return 404

**Issue:** `/cdn-cgi/image/...` URLs return 404

**Solutions:**
1. Verify Image Resizing is enabled in Cloudflare Dashboard
2. Verify original image URL works first
3. Check transformation syntax is correct: `/cdn-cgi/image/width=960,format=auto/filename.jpg`

### Transformation quota exceeded

**Issue:** Transformations stop working or return errors

**Solutions:**
1. Check quota usage in Cloudflare Dashboard (R2 → Analytics)
2. Verify you're using only fixed widths (960, 1440, 1920)
3. Review transformation quota in `dev_docs/development_plan.md`
4. Consider upgrading to paid tier if needed

## Monitoring

### Check R2 Usage

In Cloudflare Dashboard:
- Go to R2 Object Storage → `imnotyourson-photos`
- View "Analytics" tab for:
  - Storage usage (GB)
  - Read/write operations
  - Data transfer

### Check Image Transformation Usage

In Cloudflare Dashboard:
- Go to your domain → Analytics → Traffic
- Look for Image Resizing metrics
- Monitor unique transformations count

## Backup Strategy

R2 objects are automatically replicated by Cloudflare. For additional safety:

1. **Keep local copies** of original photos before upload
2. **Version control**: Consider committing low-res versions to Git for reference
3. **Export bucket contents** periodically:
   ```bash
   npx wrangler r2 object list imnotyourson-photos --remote > r2-inventory.txt
   ```

## Cost Monitoring

### Free Tier Limits (as of 2026-01)

- **Storage**: 10 GB/month free
- **Write operations**: 1 million/month free
- **Read operations**: 10 million/month free
- **Image transformations**: 5,000 unique/month free

### Current Usage (Updated: 2026-01-11)

- **Storage**: ~35 MB (5 photos, originals only)
- **Transformations**: 16 unique (0.32% of quota)
- **Estimated monthly**: ~150 transformations if 10 posts added

See `dev_docs/development_plan.md` for detailed quota tracking.

## Next Steps

1. ✅ R2 bucket created and configured
2. ✅ Custom domain working
3. ✅ Image transformations enabled
4. ✅ Sample photos uploaded
5. [ ] Document upload workflow in main README
6. [ ] Create batch upload script
7. [ ] Set up monitoring alerts for quota usage
