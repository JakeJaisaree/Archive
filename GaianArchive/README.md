# Gaian Archive

A single Node/Express server that serves a static front-end and connects to OpenAI + Stripe.
Knowledge Base is a server-side JSON file (`backend/knowledgeBase.json`).

## Quick start
1) Copy `.env.example` to `.env` and fill values.
2) `npm i`
3) `npm run dev` (or `npm start`)
4) Open http://localhost:4242

## Notes
- Front-end calls your server endpoints (`/api/chat`, `/api/knowledge`, `/api/create-checkout-session`).
- Remove `.env` from version control.
- Admin panel is hidden behind the “Admin” button; requires `ADMIN_PASSWORD` to upsert entries.
