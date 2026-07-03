/**
 * HLK Nasal Strips — Contact Form Handler
 * Cloudflare Pages Function: handles POST /api/contact
 * 
 * Email delivery via Resend (free 100/day) or any webhook.
 * Default recipient: salesmanager@hlktape.com
 * Set env vars in Cloudflare Pages Dashboard:
 *   RESEND_API_KEY  — your Resend API key (required)
 *   CONTACT_EMAIL   — (optional) override recipient email, defaults to salesmanager@hlktape.com
 *   NOTIFY_WEBHOOK  — (optional) fallback webhook URL
 */

export async function onRequest(context) {
  const { request, env } = context;

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  // Only POST
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const data = await request.json();

    // Validate required fields
    const required = ['name', 'email', 'product', 'message'];
    const missing = required.filter((f) => !data[f] || !data[f].trim());
    if (missing.length > 0) {
      return json(
        { error: `Missing required fields: ${missing.join(', ')}` },
        400,
      );
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return json({ error: 'Invalid email address' }, 400);
    }

    // Try email notification
    let emailSent = false;
    const notifyEmail = env.CONTACT_EMAIL || 'salesmanager@hlktape.com';
    const resendKey = env.RESEND_API_KEY;
    const webhookUrl = env.NOTIFY_WEBHOOK;

    if (resendKey && notifyEmail) {
      try {
        await sendViaResend(resendKey, notifyEmail, data);
        emailSent = true;
      } catch (e) {
        console.error('Resend failed:', e.message);
      }
    }

    // Fallback: webhook
    if (!emailSent && webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildPayload(data)),
        });
        emailSent = true;
      } catch (e) {
        console.error('Webhook failed:', e.message);
      }
    }

    return json({
      success: true,
      message:
        'Thank you for your inquiry! Our team will get back to you within 24 hours.',
    });
  } catch (err) {
    console.error('Contact form error:', err.message);
    return json({ error: 'Something went wrong. Please try again or email us directly.' }, 500);
  }
}

/** Send email via Resend API */
async function sendViaResend(apiKey, notifyEmail, data) {
  const payload = buildPayload(data);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: 'HLK Nasal Strips <noreply@hlknasalstrips.com>',
      to: notifyEmail,
      reply_to: data.email,
      subject: `New Inquiry: ${data.product} — from ${data.name}`,
      html: emailHTML(payload),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error ${res.status}: ${body}`);
  }
}

/** Build structured payload from form data */
function buildPayload(data) {
  return {
    name: data.name?.trim() || '',
    email: data.email?.trim() || '',
    company: data.company?.trim() || 'Not provided',
    phone: data.phone?.trim() || 'Not provided',
    product: data.product || '',
    quantity: data.quantity || 'Not specified',
    message: data.message?.trim() || '',
    submittedAt: new Date().toISOString(),
  };
}

/** Generate HTML email body */
function emailHTML(p) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
  <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 12px rgba(0,0,0,0.06);">
    <h2 style="color: #1E88E5; margin: 0 0 8px;">New Inquiry Received</h2>
    <p style="color: #6B7280; margin: 0 0 24px; font-size: 14px;">Submitted at ${new Date(p.submittedAt).toLocaleString('en-US', { timeZone: 'Asia/Shanghai' })} (GMT+8)</p>
    
    <table style="width: 100%; border-collapse: collapse;">
      <tr><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6B7280; font-size: 13px; width: 120px;">Name</td><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${esc(p.name)}</td></tr>
      <tr><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6B7280; font-size: 13px;">Email</td><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${esc(p.email)}</td></tr>
      <tr><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6B7280; font-size: 13px;">Company</td><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${esc(p.company)}</td></tr>
      <tr><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6B7280; font-size: 13px;">Phone</td><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${esc(p.phone)}</td></tr>
      <tr><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6B7280; font-size: 13px;">Product</td><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${esc(p.product)}</td></tr>
      <tr><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6B7280; font-size: 13px;">Quantity</td><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${esc(p.quantity)}</td></tr>
    </table>
    
    <div style="margin-top: 20px; padding: 16px; background: #f5f9ff; border-radius: 8px; border-left: 4px solid #1E88E5;">
      <p style="margin: 0; font-size: 13px; color: #6B7280;">Message:</p>
      <p style="margin: 8px 0 0; font-size: 15px; line-height: 1.6;">${esc(p.message)}</p>
    </div>
    
    <p style="margin-top: 24px; font-size: 12px; color: #9CA3AF;">This inquiry was submitted via hlknasalstrips.com contact form.</p>
  </div>
</body>
</html>`;
}

/** Simple escape for HTML */
function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** JSON response helper */
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
