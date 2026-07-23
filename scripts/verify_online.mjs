// 抓取线上原始 HTML，精确核对 SEO meta 是否生效
const urls = [
  'https://en.hlknasalstrips.com/',
  'https://en.hlknasalstrips.com/NasalDilator/',
  'https://en.hlknasalstrips.com/products/',
  'https://en.hlknasalstrips.com/oem/',
];

function extract(html, re, label) {
  const m = html.match(re);
  console.log(`  [${label}] ${m ? m[0] : 'NOT FOUND'}`);
}

for (const url of urls) {
  try {
    const res = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
    const html = await res.text();
    console.log(`\n=== ${url} (HTTP ${res.status}) ===`);
    extract(html, /<meta name="keywords"[^>]*>/i, 'keywords');
    extract(html, /<link rel="canonical"[^>]*>/i, 'canonical');
    if (url.includes('NasalDilator')) {
      extract(html, /<meta property="og:url"[^>]*>/i, 'og:url');
    }
    extract(html, /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i, 'first JSON-LD');
    // 统计 breadcrumb JSON-LD
    const bc = html.match(/"@type"\s*:\s*"BreadcrumbList"/);
    console.log(`  [breadcrumb JSON-LD] ${bc ? 'PRESENT' : 'none'}`);
  } catch (e) {
    console.log(`\n=== ${url} ERROR: ${e.message}`);
  }
}
