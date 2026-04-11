'use client';

import { AnimatePresence, motion } from 'framer-motion';

import { Tooltip } from '@/components/ui/Tooltip';
import type { CollaboratorPresence } from '@/types/collaboration';

type PresenceAvatarsProps = {
  collaborators: CollaboratorPresence[];
};

const MAX_VISIBLE = 5;

function initialsFor(name: string | null) {
  if (!name) return '?';
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function PresenceAvatars({ collaborators }: PresenceAvatarsProps) {
  if (!collaborators.length) return null;

  const visible = collaborators.slice(0, MAX_VISIBLE);
  const hiddenCount = collaborators.length - visible.length;

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        <AnimatePresence>
          {visible.map((collaborator) => {
            const label = collaborator.name ?? 'Collaborator';
            const ringClass = collaborator.isSelf ? 'ring-emerald-400/80' : 'ring-white/20';

            return (
              <motion.div
                key={`${collaborator.clientId}-${collaborator.userId}`}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              >
                <Tooltip content={label}>
                  <div
                    className={`relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 ring-2 ${ringClass}`}
                    style={{ backgroundColor: collaborator.color }}
                    aria-label={label}
                  >
                    {collaborator.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={collaborator.avatar}
                        alt={label}
                        className="h-full w-full rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="text-xs font-semibold text-black/80">
                        {initialsFor(collaborator.name)}
                      </span>
                    )}
                  </div>
                </Tooltip>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      {hiddenCount > 0 ? (
        <span className="text-xs font-medium text-white/60">+{hiddenCount}</span>
      ) : null}
    </div>
  );
}
