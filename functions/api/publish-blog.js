/**
 * Blog Publishing API for External AI Agents
 *
 * POST /api/publish-blog
 * Headers: x-api-key: YOUR_BLOG_API_KEY
 * Body: {
 *   title:     string  (required) — article title
 *   slug:      string  (optional) — URL slug, auto-generated from title if omitted
 *   excerpt:   string  (optional) — short description, auto-generated if omitted
 *   category:  string  (optional) — default "Industry Insights"
 *   markdown:  string  (required) — full article body in Markdown
 *   coverImage: string  (optional) — URL (http/https) to download, or local path (/images/...)
 *   readTime:  string  (optional) — e.g. "5 min read", auto-calculated if omitted
 * }
 *
 * Response: { success: true, url: "/blog/your-slug" }
 *
 * Environment variables needed:
 *   BLOG_API_KEY    — shared secret for API authentication
 *   GITHUB_TOKEN    — GitHub personal access token with repo write access
 *   GITHUB_OWNER     — GitHub username (default: hokithree7)
 *   GITHUB_REPO      — GitHub repo name (default: hlk-nasal-strips)
 */

const GITHUB_OWNER = 'hokithree7';
const GITHUB_REPO = 'hlk-nasal-strips';
const GITHUB_BRANCH = 'main';

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

  return `---\n${frontmatterYaml}\n---\n\n${data.markdown}\n`;
}

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
    // For binary data, convert to binary string in chunks to avoid stack overflow
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

    // Handle cover image
    let coverPath = null;
    if (data.coverImage) {
      if (data.coverImage.startsWith('http://') || data.coverImage.startsWith('https://')) {
        // Download external image and commit to repo
        try {
          const { buffer, ext } = await downloadImage(data.coverImage);
          const imagePath = `public/images/blog/${slug}.${ext}`;

          await commitToGitHub(
            imagePath,
            buffer,
            `Blog cover image: ${slug}`,
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
