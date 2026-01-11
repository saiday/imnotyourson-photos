import { defineCollection, z } from 'astro:content';

const postsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    public: z.boolean(),
    created_at: z.date(),
    photos: z.array(z.object({
      filename: z.string(),
      alt: z.string(),
    })),
    featured_photo: z.string().optional(),
  }),
});

export const collections = {
  posts: postsCollection,
};
