import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.string(),
    excerpt: z.string(),
    category: z.string(),
    cover: z.string().optional(),
    readTime: z.string().optional(),
    draft: z.boolean().optional().default(false),
  }),
});

export const collections = { blog };
