import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { getImageUrl } from '../utils/images';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = await getCollection('posts');

  // Filter for public posts only and sort by created_at (newest first)
  const publicPosts = posts
    .filter(post => post.data.public === true)
    .sort((a, b) => b.data.created_at.getTime() - a.data.created_at.getTime());

  const siteUrl = context.site?.toString() || 'https://photos.imnotyourson.com';

  return rss({
    title: 'imnotyourson photos',
    description: 'Photography blog by imnotyourson',
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
