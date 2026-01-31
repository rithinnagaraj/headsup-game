'use client';

// ============================================
// SOUND EFFECTS MANAGER
// ============================================

class SoundManager {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private enabled: boolean = true;
  private initialized: boolean = false;

  // Sound URLs (using free sound effects)
  private soundUrls: Record<string, string> = {
    pop: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
    ding: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
    buzzer: 'https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3',
    tick: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  };

  init() {
    if (this.initialized || typeof window === 'undefined') return;

    Object.entries(this.soundUrls).forEach(([name, url]) => {
      const audio = new Audio(url);
      audio.preload = 'auto';
      audio.volume = 0.5;
      this.sounds.set(name, audio);
    });

    this.initialized = true;
  }

  play(soundName: 'pop' | 'ding' | 'buzzer' | 'tick') {
    if (!this.enabled || typeof window === 'undefined') return;

    this.init();

    const sound = this.sounds.get(soundName);
    if (sound) {
      // Clone to allow overlapping sounds
      const clone = sound.cloneNode() as HTMLAudioElement;
      clone.volume = soundName === 'tick' ? 0.3 : 0.5;
      clone.play().catch(() => {
        // Ignore autoplay errors
      });
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  isEnabled() {
    return this.enabled;
  }
}

export const soundManager = new SoundManager();
