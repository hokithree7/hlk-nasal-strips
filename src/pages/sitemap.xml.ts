import { getCollection } from 'astro:content';

const SITE = 'https://en.hlknasalstrips.com';

// Static pages with SEO priorities
const staticPages = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/products', changefreq: 'weekly', priority: '0.9' },
  { path: '/oem', changefreq: 'weekly', priority: '0.9' },
  { path: '/about', changefreq: 'monthly', priority: '0.7' },
  { path: '/trust', changefreq: 'monthly', priority: '0.8' },
  { path: '/contact', changefreq: 'monthly', priority: '0.8' },
  { path: '/faq', changefreq: 'monthly', priority: '0.6' },
  { path: '/blog', changefreq: 'weekly', priority: '0.8' },
  { path: '/NasalDilator', changefreq: 'monthly', priority: '0.7' },
  { path: '/ClassicNasalStrips', changefreq: 'monthly', priority: '0.7' },
  { path: '/terms', changefreq: 'yearly', priority: '0.3' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
];

export async function GET() {
  const blogPosts = await getCollection('blog');

  const urls = [
    ...staticPages.map((p) => `  <url>
    <loc>${SITE}${p.path}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`),
    ...blogPosts.map(
      (post) => `  <url>
    <loc>${SITE}/blog/${post.id.replace(/\.md$/, '')}</loc>
    <lastmod>${typeof post.data.date === 'string' ? post.data.date.split('T')[0] : post.data.date.toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`
    ),
  ].join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
