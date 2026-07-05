# BrandSethu Backend

A tiny Express API that receives Contact Us form submissions from the frontend
and relays them into the **"Contact Us" Google Form**. Each submission shows up
as a normal response in the form's Responses tab (and any linked Google Sheet).

## Setup

```bash
cd backend
npm install
cp .env.example .env   # then fill in your values (optional)
npm run dev            # starts on http://localhost:3001 (auto-reloads)
```

## Environment variables (`.env`)

| Variable         | Required | Description                                                  |
| ---------------- | -------- | ------------------------------------------------------------ |
| `ALLOWED_ORIGIN` | no       | Allowed frontend origin(s), comma-separated. Defaults to `*`. |
| `PORT`           | no       | Port to listen on. Defaults to `3001`.                        |

## Google Form mapping

The target form and its field ids are defined in `server.js`
(`GOOGLE_FORM_ACTION` and `FORM_ENTRIES`). They were read from the form's public
HTML. If you change the form's questions, update these:

| Field         | Entry id             | Required |
| ------------- | -------------------- | -------- |
| Name          | `entry.1758150051`   | yes      |
| Mobile No.    | `entry.1511013304`   | yes (10-digit) |
| Email ID      | `entry.1205325636`   | no       |
| Description   | `entry.1823440707`   | yes      |

## API

### `POST /api/contact`

Request body (JSON):

```json
{
  "name": "Aarav Mehta",
  "mobile": "9876543210",
  "email": "aarav@brand.com",
  "description": "We want to grow our social presence."
}
```

Responses:

- `200 { "ok": true }` — submitted to the Google Form
- `400 { "error": "..." }` — validation failed
- `502 / 500 { "error": "..." }` — Google Form submission problem

### `GET /health`

Returns `{ "ok": true }` — useful for uptime checks.

## Deploy

Deploy anywhere that runs Node (Render, Railway, Fly.io, a VPS, etc.):

- Build command: `npm install`
- Start command: `npm start`
- Set the environment variables from `.env` in the platform dashboard.

After deploying, set the frontend's `VITE_API_URL` to this backend's public URL.
