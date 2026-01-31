'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// ============================================
// EMOJI STREAM COMPONENT (Like TikTok/Instagram)
// ============================================

interface EmojiParticle {
  id: number;
  emoji: string;
  x: number;
  delay: number;
  duration: number;
  size: number;
}

interface EmojiStreamProps {
  type: 'YES' | 'NO' | 'MAYBE';
  trigger: number; // Increment this to trigger a new stream
}

const EMOJI_MAP = {
  YES: '👍',
  NO: '👎',
  MAYBE: '🤔',
};

export function EmojiStream({ type, trigger }: EmojiStreamProps) {
  const [particles, setParticles] = useState<EmojiParticle[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (trigger === 0) return;

    // Create a burst of emojis
    const newParticles: EmojiParticle[] = [];
    const count = 8 + Math.floor(Math.random() * 5); // 8-12 emojis

    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: Date.now() + i,
        emoji: EMOJI_MAP[type],
        x: 10 + Math.random() * 80, // Random x position (10-90%)
        delay: Math.random() * 300, // Stagger the animations
        duration: 1500 + Math.random() * 1000, // 1.5-2.5 seconds
        size: 24 + Math.random() * 16, // 24-40px
      });
    }

    setParticles((prev) => [...prev, ...newParticles]);

    // Clean up after animation
    const timeout = setTimeout(() => {
      setParticles((prev) =>
        prev.filter((p) => !newParticles.find((np) => np.id === p.id))
      );
    }, 3000);

    return () => clearTimeout(timeout);
  }, [trigger, type]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute animate-emoji-float"
          style={{
            left: `${particle.x}%`,
            bottom: '-50px',
            fontSize: `${particle.size}px`,
            animationDelay: `${particle.delay}ms`,
            animationDuration: `${particle.duration}ms`,
          }}
        >
          {particle.emoji}
        </div>
      ))}
    </div>,
    document.body
  );
}
