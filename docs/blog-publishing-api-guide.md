# HLK Blog Auto-Publishing API Guide

> For AI agents (Accio etc.) that auto-generate and publish blog articles to en.hlknasalstrips.com

## Quick Start

```bash
curl -X POST https://en.hlknasalstrips.com/api/publish-blog \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_BLOG_API_KEY" \
  -d '{
    "title": "Why Nasal Strips Are the #1 Amazon Category for 2026",
    "slug": "nasal-strips-amazon-2026",
    "category": "Market Insights",
    "excerpt": "A deep dive into why nasal strips dominate Amazon's wellness category...",
    "markdown": "# Why Nasal Strips Are the #1 Amazon Category\n\nFull markdown content here...",
    "coverImage": "https://example.com/cover-image.jpg",
    "readTime": "5 min read"
  }'
```

## API Reference

### Endpoint
`POST https://en.hlknasalstrips.com/api/publish-blog`

### Authentication
Header: `x-api-key: YOUR_BLOG_API_KEY`

> **Setup**: Cloudflare Pages → en.hlknasalstrips.com project → Settings → Environment Variables → Add `BLOG_API_KEY` with your secret value. Also ensure `GITHUB_TOKEN` is set (GitHub PAT with repo write access to `hokithree7/hlk-nasal-strips`).

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | string | Yes | Article title |
| `markdown` | string | Yes | Full article body in Markdown |
| `slug` | string | No | URL slug (auto-generated from title if omitted) |
| `excerpt` | string | No | Short description (auto-generated if omitted) |
| `category` | string | No | Default: `"Industry Insights"` |
| `coverImage` | string | No | URL to download, or local path like `/images/xxx.jpg` |
| `readTime` | string | No | e.g. `"5 min read"` (auto-calculated if omitted) |
| `injectCoverToBody` | boolean | No | Default: `true`. Inject `![cover](path)` as first line of markdown body |
| `forceOverwriteCover` | boolean | No | Default: `true`. Force re-download & overwrite existing cover image |

### Response

```json
{
  "success": true,
  "url": "/blog/your-slug",
  "slug": "your-slug",
  "coverPath": "/images/blog/your-slug.jpg",
  "message": "Blog post published. Cloudflare Pages will auto-deploy in ~1-2 minutes."
}
```

## Cover Image Handling (v2 - Fixed)

### How it works now:

1. **Download & Store**: If `coverImage` is an external URL (`http://` or `https://`), the server downloads it and commits to `public/images/blog/{slug}.{ext}` in the GitHub repo.

2. **Overwrite Protection (Solution A)**: Before uploading a new cover, the server automatically deletes any existing cover files for the same slug across ALL extensions (`.png`, `.jpg`, `.jpeg`, `.webp`). This ensures the list page thumbnail always shows the latest image.

3. **Auto-inject to Body (Solution B)**: By default (`injectCoverToBody: true`), the server injects `![Article Title](/images/blog/slug.jpg)` as the first line of the markdown body. This ensures the cover image appears at the top of the article detail page. Set `injectCoverToBody: false` to disable.

4. **Force Overwrite (Solution C)**: `forceOverwriteCover` (default: `true`) explicitly controls whether to re-download and overwrite an existing cover. Set to `false` to skip cover download if one already exists.

### Frontmatter `cover` field:
The server always sets `cover: "/images/blog/{slug}.{ext}"` in the frontmatter. This is used by:
- Blog list page: card thumbnail
- Article detail page: header cover image (rendered above the prose content)
- OG/Twitter meta tags: social sharing image

## Available Categories

Based on existing articles, recommended categories:

| Category | Use for |
|---|---|
| `Industry Insights` | Market trends, manufacturing insights, supply chain |
| `Market Insights` | Amazon/retail analysis, category data, competition |
| `Sleep Health` | Mouth tape, sleep patches, breathing science |
| `Sports & Fitness` | Nasal strips for athletes, performance breathing |
| `Product Guide` | How to choose, product comparisons, buyer guides |
| `Import Guide` | OEM/ODM process, MOQ, shipping, customs |
| `OEM Tips` | Customization, branding, packaging tips |

## Slug Naming Convention

- Use lowercase kebab-case: `nasal-strips-amazon-2026`
- Max 60 characters
- Include 1-2 keywords for SEO
- Examples:
  - `mouth-tape-benefits-for-sleep`
  - `oem-nasal-strip-manufacturing-guide`
  - `how-to-choose-nasal-dilator`

## Best Practices for Accio Agent

### Article Structure
```markdown
# Catchy Title with Keywords

Opening hook paragraph (2-3 sentences)...

## Section 1: Problem/Opportunity
Content with data points...

## Section 2: Solution/Product
Content referencing HLK products...

## Section 3: Why It Matters
Content with market data...

## Conclusion
CTA to /contact or /products
```

### SEO Tips
- Title: 50-60 characters, include primary keyword
- Excerpt: 120-160 characters meta description
- Use H2/H3 headings for structure (these auto-generate Table of Contents)
- Include product links: `[nasal strips](/products#nasal-strips)`
- Target 800-1500 words per article
- Include 3-5 internal links to other blog posts or product pages

### Cover Image Tips
- Recommended size: 1200x630px (OG image standard)
- Format: JPG or PNG
- The agent can use ImageGen to create a cover, upload it to any image hosting, and pass the URL
- Or use product photos from the website: `coverImage: "/images/1 (1).jpg"`

### Publishing Workflow
1. Generate article title and markdown content
2. Generate or select a cover image
3. Upload cover image to an accessible URL (or use local path)
4. POST to `/api/publish-blog` with all fields
5. Verify: check `https://en.hlknasalstrips.com/blog/` for the new article
6. Wait 1-2 minutes for Cloudflare Pages auto-deploy

## Error Handling

| Status | Meaning | Action |
|---|---|---|
| 200 | Success | Article published, wait for deploy |
| 400 | Bad request | Check required fields (title, markdown) |
| 401 | Invalid API key | Verify `BLOG_API_KEY` header |
| 500 | Server error | Check `GITHUB_TOKEN` env var on Cloudflare |

## Republishing / Updating

To update an existing article, simply POST again with the same `slug`. The server will:
- Overwrite the markdown file (SHA-based upsert)
- Clean up old cover images and upload the new one
- Cloudflare Pages will auto-rebuild and deploy

## Environment Variables Checklist

On Cloudflare Pages (en.hlknasalstrips.com project → Settings → Environment Variables):

| Variable | Required | Description |
|---|---|---|
| `BLOG_API_KEY` | Yes | Shared secret for API auth |
| `GITHUB_TOKEN` | Yes | GitHub PAT with `repo` scope (write access) |
| `RESEND_API_KEY` | For contact form | Email notification service |

---

**Last updated**: 2026-07-14  
**API version**: v2 (with coverImage fix)  
**Repo**: hokithree7/hlk-nasal-strips
