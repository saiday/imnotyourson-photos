# Quota Monitoring Runbook

Manual procedures for monitoring Cloudflare R2 and Image Transformation quotas.

## Overview

This site operates on Cloudflare free tier with specific quotas. Regular monitoring ensures the site stays within limits and prevents service disruption.

## Monitoring Schedule

**Recommended frequency:** Monthly (first week of each month)

**Trigger for immediate check:**
- After uploading multiple new posts
- If image loading becomes slow or fails
- Before major content additions

## R2 Storage Quota

### Free Tier Limits

- Storage: 10 GB/month
- Read operations: 10 million/month
- Write operations: 1 million/month

### Check Storage Usage

**Method 1: Cloudflare Dashboard**

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to R2 Object Storage
3. Click on `imnotyourson-photos` bucket
4. Go to "Metrics" tab
5. Review:
   - Storage usage (GB)
   - Read operations count
   - Write operations count
   - Historical trends (last 7/30 days)

**Method 2: CLI (Approximate)**

```bash
# List all objects in bucket
npx wrangler r2 object list imnotyourson-photos --remote

# Count total objects
npx wrangler r2 object list imnotyourson-photos --remote | grep -c "key"

# Export full inventory
npx wrangler r2 object list imnotyourson-photos --remote > r2-inventory-$(date +%Y-%m-%d).txt
```

Note: Wrangler CLI does not provide size totals directly. Use Dashboard for storage size.

### Expected Usage Patterns

**Storage:**
- Original photos: ~5-10 MB each
- 200 photos = ~1-2 GB
- Well within 10 GB limit

**Read operations:**
- 1 operation per image view
- 10M operations = ~333,333 photo views/month
- Typical usage: <100,000 operations/month

**Write operations:**
- Only during new post uploads
- Batch uploads: ~30 operations per post
- Expected: <500 operations/month

### Warning Thresholds

| Metric | Warning (80%) | Critical (95%) | Action Required |
|--------|--------------|----------------|-----------------|
| Storage | 8 GB | 9.5 GB | Delete unused images or upgrade |
| Read ops | 8M/month | 9.5M/month | Enable aggressive caching |
| Write ops | 800K/month | 950K/month | Review upload scripts |

### Actions if Quota Exceeded

**Storage limit exceeded:**
1. Review and delete unused images
2. Audit for duplicate uploads
3. Consider Cloudflare paid tier ($5/month for 100 GB)

**Read operations exceeded:**
1. Verify Cloudflare caching is enabled
2. Check for bot traffic in analytics
3. Consider Cloudflare paid tier (100M operations)

**Write operations exceeded:**
1. Review upload scripts for errors/retries
2. Batch uploads more efficiently
3. Consider manual cleanup of failed uploads

## Image Transformation Quota

### Free Tier Limits

- 5,000 unique transformations/month
- Cached transformations are free (repeated requests)

### Check Transformation Usage

**Method 1: Cloudflare Dashboard**

1. Log in to Cloudflare Dashboard
2. Select `imnotyourson.com` domain
3. Go to Analytics → Traffic
4. Scroll to "Image Resizing" section
5. Review:
   - Unique transformations count
   - Total requests (includes cached)
   - Cache hit ratio

**Method 2: Calculate Expected Usage**

```bash
# Count posts
ls -1 src/content/posts/*.md | wc -l

# Count photos in posts
grep -h "filename:" src/content/posts/*.md | wc -l

# Calculate transformations
# Formula: photos × widths (3: 960, 1440, 1920) + featured photos (1200px)
# Example: 200 photos × 3 widths = 600 transformations
```

### Expected Usage Patterns

**Current configuration:**
- 3 standardized widths: 960px, 1440px, 1920px
- 1 Open Graph width: 1200px (featured photos only)
- ~200 photos × 3 widths = 600 transformations
- Featured photos: ~30 posts × 1 = 30 transformations
- Total: ~630 transformations/month

**Safe capacity:** Up to ~800 photos before approaching limit

### Warning Thresholds

| Metric | Warning (80%) | Critical (95%) | Action Required |
|--------|--------------|----------------|-----------------|
| Unique transformations | 4,000/month | 4,750/month | Reduce widths or upgrade |

### Actions if Quota Exceeded

**Approaching transformation limit:**
1. Verify only fixed widths are used (960, 1440, 1920)
2. Check for varying quality/format parameters in URLs
3. Review transformation cache hit ratio (should be >80%)
4. Consider reducing to 2 widths (960, 1920)

**Limit exceeded:**
1. Temporarily disable one width variant
2. Upgrade to Cloudflare Pro ($20/month for 100,000 transformations)
3. Review logs for unusual transformation patterns

## Cloudflare Pages Bandwidth

### Free Tier Limits

- Unlimited bandwidth (no explicit limit)
- 500 builds/month
- 20,000 requests/day

### Check Usage

1. Cloudflare Dashboard → Pages
2. Select `imnotyourson-photos` project
3. Go to Analytics tab
4. Review:
   - Requests/day
   - Data served
   - Build count

### Expected Usage

**Builds:**
- 1-2 builds per new post
- Expected: ~30 builds/month
- Well within 500 limit

**Requests:**
- Typical traffic: <5,000 requests/day
- Well within 20,000 limit

## Monitoring Checklist

Use this monthly checklist:

```
Date: ___________

R2 Storage:
[ ] Storage usage: _____ GB / 10 GB
[ ] Read operations: _____ M / 10 M
[ ] Write operations: _____ K / 1 M
[ ] Status: OK / WARNING / CRITICAL

Image Transformations:
[ ] Unique transformations: _____ / 5,000
[ ] Cache hit ratio: _____%
[ ] Status: OK / WARNING / CRITICAL

Cloudflare Pages:
[ ] Builds this month: _____ / 500
[ ] Avg requests/day: _____ / 20,000
[ ] Status: OK / WARNING / CRITICAL

Actions Required:
[ ] None
[ ] _______________________________
[ ] _______________________________

Notes:
_______________________________________
_______________________________________
```

## Automated Monitoring (Future)

Currently monitoring is manual. For automation, consider:

**Option 1: Cloudflare API + GitHub Actions**
- Query Cloudflare API for quota usage
- Run weekly via GitHub Actions
- Send notification if thresholds exceeded

**Option 2: Cloudflare Logpush**
- Enable Logpush to external service
- Configure alerts in log aggregation tool
- Requires paid Cloudflare tier

**Option 3: Simple script**
```bash
#!/bin/bash
# check-quotas.sh (example, requires CF API token)

# R2 API check
curl -X GET "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/r2/buckets/$BUCKET_NAME/usage" \
  -H "Authorization: Bearer $CF_API_TOKEN" | jq .

# Note: Full implementation requires Cloudflare API research
```

## Related Documentation

- `dev_docs/site_tech_decision.md` - Quota limits and strategy
- `dev_docs/r2_setup_guide.md` - R2 configuration details
- `dev_docs/operational_atlas/runbooks/backup_restore.md` - Backup procedures

## Support

If quota issues occur:
1. Review this runbook first
2. Check Cloudflare status page: https://www.cloudflarestatus.com
3. Review Cloudflare documentation: https://developers.cloudflare.com
4. Contact Cloudflare support (if paid tier)
