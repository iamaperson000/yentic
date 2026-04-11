'use client';

import { useMotionValueEvent, useScroll } from 'framer-motion';
import { useState } from 'react';

export function useScrollDirection() {
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, 'change', (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    setHidden(latest > previous && latest > 80);
    setScrolled(latest > 20);
  });

  return { hidden, scrolled };
}
