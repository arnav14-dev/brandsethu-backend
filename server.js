import 'dotenv/config'
import express from 'express'
import cors from 'cors'

const {
  ALLOWED_ORIGIN = '*',
  PORT = 3001,
  // Google Chat incoming webhook — enquiries are announced here. Set in backend/.env.
  // When unset, Chat notifications are skipped (enquiries are still saved to the form).
  GOOGLE_CHAT_WEBHOOK = '',
} = process.env

// ── Google Form ──────────────────────────────────────────────────────────────
// Submissions are relayed into the "Contact Us" Google Form. Each field maps to
// the form's internal entry id (read from the form's public HTML). Update these
// if the form's questions change.
const GOOGLE_FORM_ACTION =
  'https://docs.google.com/forms/d/e/1FAIpQLScmFn4-fbtXmS_okezCfUaTmg2eumpI-oVty8_hLM1vIvTPiA/formResponse'

const FORM_ENTRIES = {
  name: 'entry.1758150051', // Name           (required)
  mobile: 'entry.1511013304', // Mobile No.    (required, 10-digit)
  email: 'entry.1205325636', // Email ID       (optional)
  description: 'entry.1823440707', // Description (required)
}

const app = express()
app.use(express.json({ limit: '100kb' }))

// CORS — allow one or more comma-separated origins, or "*" for any.
const origins = ALLOWED_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
app.use(
  cors({
    origin: ALLOWED_ORIGIN === '*' ? true : origins,
    methods: ['POST', 'GET'],
  })
)

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
const isMobile = (value) => /^[6-9][0-9]{9}$/.test(value)

// Post a formatted alert to Google Chat. Best-effort: never throws — a failed
// notification must not fail the enquiry, which is already saved in the form.
async function notifyGoogleChat({ name, business, mobile, email, website, socials, help, preferred, description }) {
  if (!GOOGLE_CHAT_WEBHOOK) return
  const submittedAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
  const text = [
    '*New enquiry — Brandsethu*',
    '',
    `*Name :* ${name}`,
    `*Business :* ${business || '—'}`,
    `*Mobile :* ${mobile}`,
    `*Email :* ${email || '—'}`,
    `*Needs help with :* ${help || '—'}`,
    `*Preferred contact :* ${preferred || '—'}`,
    `*Website :* ${website || '—'}`,
    `*Socials :* ${socials || '—'}`,
    '',
    `*Requirement :* ${description}`,
    '',
    `_${submittedAt} IST_`,
  ].join('\n')

  try {
    const res = await fetch(GOOGLE_CHAT_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) console.error('[google-chat] notify failed:', res.status)
  } catch (err) {
    console.error('[google-chat] notify error:', err)
  }
}

app.get('/health', (_req, res) => res.json({ ok: true }))

app.post('/api/contact', async (req, res) => {
  const {
    name = '',
    business = '',
    email = '',
    mobile = '',
    website = '',
    socials = '',
    help = '',
    description = '',
    preferred = '',
  } = req.body || {}

  // Server-side validation — mirror the contact form's required fields.
  if (!name.trim() || !mobile.trim() || !email.trim() || !description.trim()) {
    return res.status(400).json({ error: 'Name, email, mobile number and requirement are required.' })
  }
  if (!isMobile(mobile.trim())) {
    return res.status(400).json({ error: 'Please provide a valid 10-digit mobile number.' })
  }
  if (!isEmail(email.trim())) {
    return res.status(400).json({ error: 'Please provide a valid email address.' })
  }

  // The Google Form only has name/mobile/email/description entries, so fold the
  // extra fields into the description so nothing is lost.
  const extra = []
  if (business.trim()) extra.push(`Business/Brand: ${business.trim()}`)
  if (help.trim()) extra.push(`Needs help with: ${help.trim()}`)
  if (preferred.trim()) extra.push(`Preferred contact: ${preferred.trim()}`)
  if (website.trim()) extra.push(`Website: ${website.trim()}`)
  if (socials.trim()) extra.push(`Socials: ${socials.trim()}`)
  const composedDescription = extra.length
    ? `${description.trim()}\n\n———\n${extra.join('\n')}`
    : description.trim()

  // Build the form-encoded body Google expects.
  const body = new URLSearchParams()
  body.append(FORM_ENTRIES.name, name.trim())
  body.append(FORM_ENTRIES.mobile, mobile.trim())
  body.append(FORM_ENTRIES.email, email.trim())
  body.append(FORM_ENTRIES.description, composedDescription)

  try {
    const gRes = await fetch(GOOGLE_FORM_ACTION, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })

    // Google returns 200 on success (and often 302 to a confirmation page).
    if (!gRes.ok && gRes.status !== 302) {
      console.error('[google-form] submit failed:', gRes.status)
      return res.status(502).json({ error: 'Could not submit your enquiry. Please try again.' })
    }

    // Fire the Google Chat alert (best-effort — won't block or fail the response).
    await notifyGoogleChat({
      name: name.trim(),
      business: business.trim(),
      mobile: mobile.trim(),
      email: email.trim(),
      website: website.trim(),
      socials: socials.trim(),
      help: help.trim(),
      preferred: preferred.trim(),
      description: description.trim(),
    })

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[google-form] unexpected error:', err)
    return res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
})

app.listen(PORT, () => {
  console.log(`BrandSethu backend listening on http://localhost:${PORT}`)
})
