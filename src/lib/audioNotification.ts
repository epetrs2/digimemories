/**
 * Audio Chime and Browser Notification System for Admin Live Chat
 * Uses Web Audio API oscillator synthesis so no external audio files are required.
 */

class AdminNotificationManager {
  private audioCtx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private lastNotificationTime: number = 0;

  constructor() {
    // Check local storage preference
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('digimemories_admin_sound_enabled');
      this.soundEnabled = saved !== null ? saved === 'true' : true;
    }
  }

  private initAudio() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  /**
   * Play a pleasant 2-tone chime for incoming visitor messages
   */
  public playIncomingMessageSound() {
    if (!this.soundEnabled) return;
    const now = Date.now();
    // Throttle to at most 1 chime every 1.5s
    if (now - this.lastNotificationTime < 1500) return;
    this.lastNotificationTime = now;

    try {
      this.initAudio();
      if (!this.audioCtx) return;

      const ctx = this.audioCtx;
      const t = ctx.currentTime;

      // Tone 1: 587.33 Hz (D5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, t);
      gain1.gain.setValueAtTime(0.25, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(t);
      osc1.stop(t + 0.35);

      // Tone 2: 880 Hz (A5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, t + 0.12);
      gain2.gain.setValueAtTime(0.3, t + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(t + 0.12);
      osc2.stop(t + 0.55);

      // Haptic vibration on mobile devices
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([180, 80, 200]);
        } catch {}
      }
    } catch (e) {
      console.warn('[Notification Audio] Playback notice:', e);
    }
  }

  public toggleSound(enabled?: boolean): boolean {
    if (enabled !== undefined) {
      this.soundEnabled = enabled;
    } else {
      this.soundEnabled = !this.soundEnabled;
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('digimemories_admin_sound_enabled', String(this.soundEnabled));
    }
    if (this.soundEnabled) {
      this.playIncomingMessageSound();
    }
    return this.soundEnabled;
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  public async requestPushPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    try {
      if (Notification.permission === 'granted') return true;
      if (Notification.permission !== 'denied') {
        const result = await Notification.requestPermission();
        return result === 'granted';
      }
    } catch {}
    return false;
  }

  public showBrowserNotification(title: string, body: string) {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'granted' && document.hidden) {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.svg',
          badge: '/favicon.svg'
        });
      } catch {}
    }
  }
}

export const adminNotifier = new AdminNotificationManager();
