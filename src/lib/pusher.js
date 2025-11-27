import Pusher from 'pusher';

// Server-side Pusher client used within API routes. Uses environment variables to avoid
// hardcoding credentials and keeps TLS enabled for secure communication.
export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});
