# Yentic

Yentic is a browser-based IDE built with Next.js, Monaco, Prisma, NextAuth, and Yjs. It includes project persistence, shareable project links, collaborative editing primitives, and a small Pusher-backed chat demo.

## Features

- Multi-language workspaces with a Monaco editor and runtime previews
- Google authentication with profile onboarding
- Postgres-backed project storage with share tokens
- Collaborative editing powered by Yjs and WebRTC
- Marketing and dashboard flows for public profiles and projects
- Optional realtime chat demo at `/chat` backed by Pusher Channels

## Tech Stack

- Next.js 16 / React 19
- Prisma + PostgreSQL
- NextAuth with Google OAuth
- Monaco Editor
- Yjs + `y-webrtc`
- Pusher Channels for the chat demo

## Requirements

- Node.js 20.9.0 or newer
- npm
- PostgreSQL
- A Google OAuth client for sign-in
- A Pusher app if you want the `/chat` demo to work

## Local Setup

1. Clone the repository.
2. Create a local env file from the template:

```bash
cp .env.example .env.local
```

3. Install dependencies:

```bash
npm install
```

4. Push the Prisma schema to your local database:

```bash
npm run db:push
```

5. Start the development server:

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

The project reads runtime configuration from `.env.local` or `.env`.

Required for the main app:

- `DATABASE_URL`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `AUTH_SECRET`

Required for the `/chat` demo:

- `PUSHER_APP_ID`
- `PUSHER_SECRET`
- `PUSHER_CLUSTER`
- `NEXT_PUBLIC_PUSHER_KEY`
- `NEXT_PUBLIC_PUSHER_CLUSTER`

See [`.env.example`](./.env.example) for the expected shape.

## Database Notes

- Prisma is configured for PostgreSQL.
- `npm install` only generates the Prisma client; it does not mutate your database.
- Run `npm run db:push` explicitly when you want to sync the schema to a local database.

## Scripts

- `npm run dev`: starts the custom Node server for local development
- `npm run build`: runs the Next.js production build
- `npm run dist`: builds Monaco assets into `public/dist`
- `npm run start`: serves the Monaco asset bundle with webpack dev server
- `npm run app:start`: starts the production Node server
- `npm run lint`: runs ESLint
- `npm test`: runs the test suite
- `npm run db:push`: applies the Prisma schema to your configured database

## AI Disclosure 

- AI was used in the creation of this project
- Notable Occurances include for: Filler text (marketing, etc), larger text things (Security, etc), and codewise (assisting with the generation of code)


## Realtime Notes

- The main collaborative editor uses Yjs with WebRTC signaling.
- The `/chat` route is separate from editor collaboration, depends on Pusher, and requires sign-in to post messages.
- If Pusher is not configured, avoid the `/chat` route or wire in your own credentials first.

## Security

Please do not open public issues for security reports. Follow the instructions in [`SECURITY.md`](./SECURITY.md).

## License

This repository is licensed under the GNU General Public License v3.0 only. See [`LICENSE`](./LICENSE).
