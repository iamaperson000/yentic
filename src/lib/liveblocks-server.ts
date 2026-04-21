import { Liveblocks } from '@liveblocks/node';

let cached: Liveblocks | null = null;

export function getLiveblocksServer(): Liveblocks {
  if (cached) return cached;
  const secret = process.env.LIVEBLOCKS_SECRET_KEY;
  if (!secret) {
    throw new Error('LIVEBLOCKS_SECRET_KEY is not set — required for the Liveblocks auth endpoint');
  }
  cached = new Liveblocks({ secret });
  return cached;
}
