import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = await getCollection('posts');

  // Filter for public posts only
  const publicPosts = posts.filter(post => post.data.public === true);

  // Build the sitemap XML
  const siteUrl = context.site?.toString() || 'https://photos.imnotyourson.com';

  // Static pages
  const staticPages = [
    { url: siteUrl, priority: '1.0' },
    { url: `${siteUrl}archive/`, priority: '0.8' },
  ];

  // Dynamic post pages
  const postPages = publicPosts.map(post => ({
    url: `${siteUrl}${post.slug}`,
    lastmod: post.data.created_at.toISOString().split('T')[0],
    priority: '0.7',
  }));

  const allPages = [...staticPages, ...postPages];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages
  .map(
    page => `  <url>
    <loc>${page.url}</loc>${page.lastmod ? `\n    <lastmod>${page.lastmod}</lastmod>` : ''}
    <priority>${page.priority || '0.5'}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
