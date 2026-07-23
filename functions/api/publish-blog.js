/**
 * Blog Publishing API for External AI Agents
 *
 * POST /api/publish-blog
 * Headers: x-api-key: YOUR_BLOG_API_KEY
 * Body: {
 *   title:              string  (required) — article title
 *   slug:               string  (optional) — URL slug, auto-generated from title if omitted
 *   excerpt:            string  (optional) — short description, auto-generated if omitted
 *   category:           string  (optional) — default "Industry Insights"
 *   markdown:           string  (required) — full article body in Markdown
 *   coverImage:         string  (optional) — URL (http/https) to download, or local path (/images/...)
 *   readTime:           string  (optional) — e.g. "5 min read", auto-calculated if omitted
 *   footer:             string  (optional) — brand/author signature block rendered between
 *                                     article body and the lead-capture CTA. Supports simple
 *                                     markdown (**bold**, links, emails). Stored as YAML block scalar.
 *   injectCoverToBody:  boolean (optional) — default true, inject ![cover](path) as first line of markdown
 *   forceOverwriteCover: boolean (optional) — default true, force re-download & overwrite existing cover
 * }
 *
 * Response: { success: true, url: "/blog/your-slug", slug, coverPath }
 *
 * Environment variables needed:
 *   BLOG_API_KEY    — shared secret for API authentication
 *   GITHUB_TOKEN    — GitHub personal access token with repo write access
 */

const GITHUB_OWNER = 'hokithree7';
const GITHUB_REPO = 'hlk-nasal-strips';
const GITHUB_BRANCH = 'main';

const COVER_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function calculateReadTime(markdown) {
  const wordsPerMinute = 200;
  const words = markdown.split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / wordsPerMinute));
  return `${minutes} min read`;
}

function generateExcerpt(markdown) {
  const plainText = markdown
    .replace(/^#+\s+/gm, '')
    .replace(/\*\*|__|`/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, ' ')
    .trim();
  const words = plainText.split(/\s+/).slice(0, 25).join(' ');
  return words + (plainText.split(/\s+/).length > 25 ? '...' : '');
}

/**
 * Build markdown file with frontmatter.
 * Solution B: optionally inject ![cover](coverPath) as first line of body.
 */
function buildMarkdownFile(data) {
  const frontmatter = {
    title: data.title,
    date: new Date().toISOString().split('T')[0],
    excerpt: data.excerpt || generateExcerpt(data.markdown),
    category: data.category || 'Industry Insights',
    readTime: data.readTime || calculateReadTime(data.markdown),
  };

  if (data.coverImage) {
    frontmatter.cover = data.coverImage;
  }

  const frontmatterYaml = Object.entries(frontmatter)
    .map(([key, value]) => `${key}: "${String(value).replace(/"/g, '\\"')}"`)
    .join('\n');

  // Footer is a multi-line brand/author signature block — store as a YAML
  // literal block scalar so newlines survive (double-quoted scalars would fold them).
  let footerYaml = '';
  if (data.footer && data.footer.trim()) {
    const indented = data.footer.trim().split('\n').map((l) => `  ${l}`).join('\n');
    footerYaml = `\nfooter: |\n${indented}`;
  }

  // Solution B: inject cover image markdown as first line of body
  let body = data.markdown;
  if (data.coverImage && data.injectCoverToBody !== false) {
    const altText = (data.title || 'cover').replace(/"/g, '');
    body = `![${altText}](${data.coverImage})\n\n${body}`;
  }

  return `---\n${frontmatterYaml}${footerYaml}\n---\n\n${body}\n`;
}

/**
 * Commit (create or update) a file to GitHub via Contents API.
 * Uses SHA-based upsert — if file exists, its SHA is fetched and included
 * in the PUT body to perform an overwrite.
 */
async function commitToGitHub(path, content, message, isBinary, env) {
  const token = env.GITHUB_TOKEN || '';
  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is not set');
  }

  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;

  // Check if file already exists to get its SHA (for updates)
  let sha;
  try {
    const checkRes = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'hlk-blog-publisher',
      },
    });
    if (checkRes.ok) {
      const existing = await checkRes.json();
      sha = existing.sha;
    }
  } catch (e) {
    // File doesn't exist yet, that's fine
  }

  // Encode content to base64
  let base64Content;
  if (isBinary && content instanceof Uint8Array) {
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < content.length; i += chunkSize) {
      const chunk = content.subarray(i, Math.min(i + chunkSize, content.length));
      binary += String.fromCharCode.apply(null, chunk);
    }
    base64Content = btoa(binary);
  } else {
    base64Content = btoa(content);
  }

  const body = {
    message,
    content: base64Content,
    branch: GITHUB_BRANCH,
  };

  if (sha) {
    body.sha = sha;
  }

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'hlk-blog-publisher',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub API error: ${res.status} ${err}`);
  }

  return await res.json();
}

/**
 * Solution A: Delete a file from GitHub (for cleaning up old cover images
 * with different extensions before uploading a new one).
 */
async function deleteFileFromGitHub(path, message, env) {
  const token = env.GITHUB_TOKEN || '';
  if (!token) return;

  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;

  try {
    const checkRes = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'hlk-blog-publisher',
      },
    });

    if (checkRes.ok) {
      const existing = await checkRes.json();
      const sha = existing.sha;

      await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'hlk-blog-publisher',
        },
        body: JSON.stringify({
          message,
          sha,
          branch: GITHUB_BRANCH,
        }),
      });
    }
  } catch (e) {
    // File doesn't exist, that's fine
  }
}

/**
 * Solution A: Clean up any existing cover images for this slug across
 * all common extensions. This ensures that when a new cover is uploaded
 * with a different extension, the old file is properly removed.
 */
async function cleanupOldCoverImages(slug, env, skipExt = null) {
  const tasks = [];
  for (const ext of COVER_EXTENSIONS) {
    if (ext === skipExt) continue;
    const path = `public/images/blog/${slug}.${ext}`;
    tasks.push(deleteFileFromGitHub(path, `Clean up old cover: ${slug}.${ext}`, env));
  }
  await Promise.all(tasks);
}

async function downloadImage(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download cover image: ${res.status}`);
  }
  const contentType = res.headers.get('content-type') || 'image/jpeg';
  const buffer = await res.arrayBuffer();
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  return { buffer: new Uint8Array(buffer), ext, contentType };
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
      },
    });
  }

  try {
    // Validate API key
    const apiKey = request.headers.get('x-api-key');
    const expectedKey = env.BLOG_API_KEY;

    if (!expectedKey) {
      return json({ success: false, error: 'BLOG_API_KEY not configured on server' }, 500);
    }

    if (apiKey !== expectedKey) {
      return json({ success: false, error: 'Invalid or missing API key' }, 401);
    }

    // Parse request body
    let data;
    try {
      data = await request.json();
    } catch (e) {
      return json({ success: false, error: 'Invalid JSON body' }, 400);
    }

    // Validate required fields
    if (!data.title || typeof data.title !== 'string') {
      return json({ success: false, error: 'title is required' }, 400);
    }

    if (!data.markdown || typeof data.markdown !== 'string') {
      return json({ success: false, error: 'markdown is required' }, 400);
    }

    // Generate slug
    const slug = data.slug ? slugify(data.slug) : slugify(data.title);

    if (!slug) {
      return json({ success: false, error: 'Could not generate valid slug from title' }, 400);
    }

    // Solution C: forceOverwriteCover (default true)
    const forceOverwrite = data.forceOverwriteCover !== false;

    // Solution B: injectCoverToBody (default true)
    const injectCover = data.injectCoverToBody !== false;

    // Handle cover image
    let coverPath = null;
    if (data.coverImage) {
      if (data.coverImage.startsWith('http://') || data.coverImage.startsWith('https://')) {
        // Download external image and commit to repo
        try {
          const { buffer, ext } = await downloadImage(data.coverImage);
          const imagePath = `public/images/blog/${slug}.${ext}`;

          // Solution A: clean up old cover files with different extensions
          // before uploading the new one (ensures true upsert behavior)
          await cleanupOldCoverImages(slug, env, ext);

          await commitToGitHub(
            imagePath,
            buffer,
            `Blog cover image: ${slug} (forceOverwrite: ${forceOverwrite})`,
            true,  // isBinary
            env
          );
          coverPath = `/images/blog/${slug}.${ext}`;
        } catch (e) {
          console.error('Cover image download failed:', e.message);
          // Continue without cover image if download fails
        }
      } else {
        // Local path like /images/xxx.jpg — use as-is
        coverPath = data.coverImage;
      }
    }

    // Build markdown file content
    const markdownContent = buildMarkdownFile({
      title: data.title,
      excerpt: data.excerpt,
      category: data.category,
      markdown: data.markdown,
      readTime: data.readTime,
      coverImage: coverPath,
      injectCoverToBody: injectCover,
      footer: data.footer,
    });

    // Commit to GitHub
    const filePath = `src/content/blog/${slug}.md`;
    try {
      await commitToGitHub(
        filePath,
        markdownContent,
        `Blog post: ${data.title}`,
        false,  // isBinary
        env
      );
    } catch (e) {
      console.error('GitHub commit failed:', e.message);
      return json({ success: false, error: `Failed to publish: ${e.message}` }, 500);
    }

    return json({
      success: true,
      url: `/blog/${slug}`,
      slug,
      coverPath,
      message: 'Blog post published. Cloudflare Pages will auto-deploy in ~1-2 minutes.',
    });
  } catch (e) {
    console.error('Publish error:', e.message, e.stack);
    return json({ success: false, error: `Server error: ${e.message}` }, 500);
  }
}

// Handle OPTIONS for CORS
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    },
  });
}
