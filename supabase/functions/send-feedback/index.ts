import { withSupabase } from 'npm:@supabase/server@^1'

const DESTINATION = 'dynastysportsstudio@gmail.com'
const FROM = 'Saturday Dynasty Feedback <onboarding@resend.dev>'
const SITE_URL = 'https://saturdaydynasty.ctoolis.workers.dev'
const MAX_FILE_BYTES = 4 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)))
  }
  return btoa(binary)
}

function textField(form: FormData, name: string, max = 5000) {
  const value = form.get(name)
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export default {
  // Public browser endpoint. The Resend API key stays server-side in Supabase secrets.
  fetch: withSupabase({ auth: 'none' }, async (req) => {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 })
    }

    const origin = req.headers.get('origin') || ''
    if (origin && origin !== SITE_URL && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return Response.json({ error: 'Origin not allowed' }, { status: 403 })
    }

    const contentLength = Number(req.headers.get('content-length') || 0)
    if (contentLength && contentLength > MAX_FILE_BYTES + 256 * 1024) {
      return Response.json({ error: 'Feedback payload is too large' }, { status: 413 })
    }

    let form: FormData
    try {
      form = await req.formData()
    } catch {
      return Response.json({ error: 'Invalid feedback form' }, { status: 400 })
    }

    // Honeypot: silently accept bot submissions without sending mail.
    if (textField(form, 'website', 200)) {
      return Response.json({ ok: true })
    }

    const type = textField(form, 'Type', 80) || 'Feedback'
    const email = textField(form, 'email', 320)
    const description = textField(form, 'Description', 5000)
    const page = textField(form, 'Page', 1000)
    const browser = textField(form, 'Browser', 1000)
    const submittedAt = textField(form, 'SubmittedAt', 80) || new Date().toISOString()

    if (description.length < 3) {
      return Response.json({ error: 'Please describe the issue or feedback' }, { status: 400 })
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: 'Invalid reply email' }, { status: 400 })
    }

    const attachment = form.get('attachment')
    let attachmentPayload: { filename: string; content: string } | null = null

    if (attachment instanceof File && attachment.size > 0) {
      if (!ALLOWED_TYPES.has(attachment.type)) {
        return Response.json({ error: 'Screenshot must be PNG, JPG, or WEBP' }, { status: 400 })
      }
      if (attachment.size > MAX_FILE_BYTES) {
        return Response.json({ error: 'Screenshot must be 4 MB or smaller' }, { status: 413 })
      }
      const bytes = new Uint8Array(await attachment.arrayBuffer())
      attachmentPayload = {
        filename: attachment.name || 'screenshot',
        content: bytesToBase64(bytes),
      }
    }

    const apiKey = Deno.env.get('RESEND_API_KEY')
    if (!apiKey) {
      console.error('RESEND_API_KEY is not configured')
      return Response.json({ error: 'Feedback email service is not configured yet' }, { status: 503 })
    }

    const safeType = escapeHtml(type)
    const safeEmail = escapeHtml(email || 'Not provided')
    const safeDescription = escapeHtml(description).replaceAll('\n', '<br>')
    const safePage = escapeHtml(page || 'Unknown')
    const safeBrowser = escapeHtml(browser || 'Unknown')
    const safeTime = escapeHtml(submittedAt)

    const payload: Record<string, unknown> = {
      from: FROM,
      to: [DESTINATION],
      subject: `[Saturday Dynasty] ${type}`,
      html: `
        <h2>Saturday Dynasty Football Feedback</h2>
        <p><strong>Type:</strong> ${safeType}</p>
        <p><strong>Reply email:</strong> ${safeEmail}</p>
        <p><strong>Description:</strong><br>${safeDescription}</p>
        <hr>
        <p><strong>Page:</strong> ${safePage}</p>
        <p><strong>Browser:</strong> ${safeBrowser}</p>
        <p><strong>Submitted:</strong> ${safeTime}</p>
      `,
      text: `Saturday Dynasty Football Feedback\n\nType: ${type}\nReply email: ${email || 'Not provided'}\n\nDescription:\n${description}\n\nPage: ${page || 'Unknown'}\nBrowser: ${browser || 'Unknown'}\nSubmitted: ${submittedAt}`,
    }

    if (email) payload.reply_to = email
    if (attachmentPayload) payload.attachments = [attachmentPayload]

    let resendResponse: Response
    try {
      resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
    } catch (err) {
      console.error('Resend network error', err)
      return Response.json({ error: 'Could not reach the feedback email service' }, { status: 502 })
    }

    let data: Record<string, unknown> = {}
    try {
      data = await resendResponse.json()
    } catch {}

    if (!resendResponse.ok) {
      console.error('Resend rejected feedback email', resendResponse.status, data)
      const serviceMessage = typeof data?.message === 'string' ? data.message : ''
      return Response.json({ error: serviceMessage || 'Feedback email could not be sent' }, { status: 502 })
    }

    return Response.json({ ok: true, id: data?.id || null })
  }),
}
