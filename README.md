# HLK Nasal Strips — Astro Static B2B Site

## Site Overview

| Metric | Value |
|--------|-------|
| Framework | Astro 5 (Static Site Generator) |
| Pages | 12 HTML pages |
| Blog Posts | 3 articles |
| Build Time | ~1.2 seconds |
| Total Size | ~150KB (HTML+CSS only) |
| Hosting | Cloudflare Pages (free) or Netlify (free) |
| CMS | Decap CMS (blog management) |

## Page Structure

```
/                           Homepage — Hero, Features, Products, OEM Process, CTA
/products                   Product Specs — Classic, Sports, Custom/Private Label
/oem                        OEM Process — 4-step workflow, customization options, timeline
/about                      Company Story — 20 years, 5000m² facility, certifications
/contact                    Contact — Inquiry form, WhatsApp, email, factory address
/faq                        FAQ — Orders, Product, OEM, Shipping, Partnership
/blog                       Blog Index — 3 articles on nasal strip industry
/blog/how-to-choose-nasal-strips    Article: Market selection guide
/blog/nasal-strips-vs-sprays       Article: Product comparison
/blog/oem-nasal-strips-guide       Article: Import guide
/privacy                    Privacy Policy
/terms                      Terms & Conditions
```

## Key B2B Features

1. **Inquiry Form**: Contact page with product selector, quantity dropdown, message field → Formspree
2. **WhatsApp Integration**: Direct chat links throughout site
3. **OEM Funnel**: Products → OEM page → Contact — clear conversion path
4. **Trust Signals**: FDA, CE, ISO 13485, SGS, RoHS badges everywhere
5. **Social Proof**: 20+ years, 5000m², 30+ countries

## How to Deploy

### Option 1: Cloudflare Pages (Recommended)
1. Push code to GitHub repo
2. Go to dash.cloudflare.com → Pages → Create project
3. Connect GitHub repo
4. Build settings: Framework=Astro, Build command=`npm run build`, Output directory=`dist`
5. Deploy — takes 2 minutes, free SSL, global CDN

### Option 2: Netlify
1. Push code to GitHub repo
2. Go to netlify.com → Add new site → Import from Git
3. Build settings: Build command=`npm run build`, Publish directory=`dist`
4. Deploy — free SSL, Netlify Forms for contact form

### Contact Form Setup
Replace `your-form-id` in `src/pages/contact.astro` with your actual Formspree form ID (free tier: 50 submissions/month).

### Blog CMS Setup (Decap CMS)
1. Enable Netlify Identity or GitHub OAuth on your hosting platform
2. Access admin panel at `/admin/index.html`
3. Create, edit, and publish blog posts via web interface
4. Posts are stored in `src/content/blog/` as Markdown files

## Files to Update Before Launch

1. `src/pages/contact.astro` line ~20 — Replace `your-form-id` with actual Formspree ID
2. Footer and contact info — Already filled with HLK data
3. Product images — Place images in `public/assets/images/` and reference them

## Development

```bash
npm run dev      # Start dev server (localhost:4321)
npm run build    # Build for production (output: dist/)
npm run preview  # Preview production build locally
```
