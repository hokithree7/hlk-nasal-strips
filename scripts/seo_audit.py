import os, re, glob

DIST = r"D:\D独立站资料\产品图片\hlk-nasal-strips\dist"

def parse(path):
    html = open(path, encoding="utf-8", errors="ignore").read()
    def meta(prop, attr="name"):
        m = re.search(r'<meta[^>]*\b%s=["\']%s["\'][^>]*content=["\']([^"\']*)["\']' % (attr, re.escape(prop)), html)
        if m: return m.group(1)
        # reversed order
        m = re.search(r'<meta[^>]*content=["\']([^"\']*)["\'][^>]*\b%s=["\']%s["\']' % (attr, re.escape(prop)), html)
        return m.group(1) if m else None
    title = re.search(r'<title>([^<]*)</title>', html)
    desc = meta("description")
    canon = meta("canonical", "rel") or re.search(r'<link[^>]*rel=["\']canonical["\'][^>]*href=["\']([^"\']*)["\']', html)
    canon = canon.group(1) if canon else None
    kw = meta("keywords")
    ogurl = meta("og:url", "property")
    robots = meta("robots")
    h1 = re.findall(r'<h1[^>]*>.*?</h1>', html, re.S|re.I)
    h1n = len(re.findall(r'<h1[\s>]', html, re.I))
    h2n = len(re.findall(r'<h2[\s>]', html, re.I))
    imgs = re.findall(r'<img\b[^>]*>', html, re.I)
    no_alt = [i for i in imgs if not re.search(r'\balt=["\']', i, re.I) or re.search(r'alt=["\']\s*["\']', i, re.I)]
    return {
        "file": os.path.relpath(path, DIST),
        "title": (title.group(1) if title else "<<MISSING>>"),
        "title_len": len(title.group(1)) if title else 0,
        "desc": desc,
        "desc_len": len(desc) if desc else 0,
        "canonical": canon,
        "keywords": kw,
        "og_url": ogurl,
        "robots": robots,
        "h1_count": h1n,
        "h2_count": h2n,
        "img_total": len(imgs),
        "img_no_alt": len(no_alt),
    }

rows = []
for f in sorted(glob.glob(DIST + "/**/*.html", recursive=True)):
    rows.append(parse(f))

print("PAGE AUDIT (dist = what search engines see)\n")
print(f"{'page':28} {'T':>3} {'D':>3} {'H1':>3} {'H2':>3} {'img':>4} {'noAlt':>5}  kw?  canon?  og:url")
for r in rows:
    print(f"{r['file']:28} {r['title_len']:>3} {r['desc_len']:>3} {r['h1_count']:>3} {r['h2_count']:>3} {r['img_total']:>4} {r['img_no_alt']:>5}  {'Y' if r['keywords'] else 'N':>3}  {'Y' if r['canonical'] else 'N':>4}  {r['og_url']}")

print("\n--- pages with problems ---")
for r in rows:
    probs = []
    if r['h1_count'] != 1: probs.append(f"H1={r['h1_count']}")
    if r['title_len'] > 70 or r['title_len'] == 0: probs.append(f"title_len={r['title_len']}")
    if r['desc_len'] > 160 or r['desc_len'] == 0: probs.append(f"desc_len={r['desc_len']}")
    if not r['canonical']: probs.append("no canonical")
    if not r['keywords']: probs.append("no <meta keywords>")
    if r['img_no_alt']: probs.append(f"{r['img_no_alt']} img no alt")
    if r['og_url'] and 'en.hlknasalstrips.com' not in r['og_url']: probs.append(f"og:url={r['og_url']}")
    if probs:
        print(f"  {r['file']:30} -> " + "; ".join(probs))
