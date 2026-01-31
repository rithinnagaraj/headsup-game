'use client';

import { useEffect } from 'react';
import confetti from 'canvas-confetti';

// ============================================
// CONFETTI CELEBRATION COMPONENT
// ============================================

interface ConfettiCelebrationProps {
  trigger: number; // Increment to trigger celebration
}

export function ConfettiCelebration({ trigger }: ConfettiCelebrationProps) {
  useEffect(() => {
    if (trigger === 0) return;

    // Create a spectacular confetti explosion
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 50 * (timeLeft / duration);

      // Confetti from both sides
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#a855f7', '#ec4899', '#fbbf24', '#34d399', '#60a5fa'],
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#a855f7', '#ec4899', '#fbbf24', '#34d399', '#60a5fa'],
      });
    }, 250);

    return () => clearInterval(interval);
  }, [trigger]);

  return null;
}

// ============================================
// SINGLE BURST CONFETTI (for card flip)
// ============================================

export function triggerCardConfetti(x: number, y: number) {
  // Normalize coordinates to 0-1 range
  const originX = x / window.innerWidth;
  const originY = y / window.innerHeight;

  // First burst
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { x: originX, y: originY },
    colors: ['#a855f7', '#ec4899', '#fbbf24', '#34d399'],
    zIndex: 9999,
  });

  // Delayed second burst
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: originX - 0.1, y: originY },
      colors: ['#a855f7', '#ec4899', '#fbbf24'],
      zIndex: 9999,
    });
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: originX + 0.1, y: originY },
      colors: ['#ec4899', '#fbbf24', '#34d399'],
      zIndex: 9999,
    });
  }, 150);
}
