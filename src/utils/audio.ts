// Web Audio API – オセロ用サウンドエンジン

class AudioEngine {
  private ctx: AudioContext | null = null;
  private isEnabled = true;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  public toggleMute(enabled: boolean) {
    this.isEnabled = enabled;
  }

  /** 石を盤に置く音（重いカチッ） */
  public playPlaceSound() {
    if (!this.isEnabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(900, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.02);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.5, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  /** 石が裏返る音（パタパタ連続） */
  public playFlipSound(count: number) {
    if (!this.isEnabled) return;
    this.init();
    if (!this.ctx) return;

    const ctx = this.ctx;
    const maxFlips = Math.min(count, 6);

    for (let i = 0; i < maxFlips; i++) {
      const t = ctx.currentTime + i * 0.055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400 + i * 30, t);
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.04);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.25, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.045);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.05);
    }
  }

  /** パス通知音 */
  public playPassSound() {
    if (!this.isEnabled) return;
    this.init();
    if (!this.ctx) return;

    const ctx = this.ctx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.linearRampToValueAtTime(330, t + 0.3);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.4);
  }

  /** 勝利音（明るいアルペジオ） */
  public playWinSound() {
    if (!this.isEnabled) return;
    this.init();
    if (!this.ctx) return;

    const ctx = this.ctx;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    const t = ctx.currentTime;

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const time = t + i * 0.15;

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.3, time + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.6);
    });
  }

  /** 敗北音（下降マイナー） */
  public playLoseSound() {
    if (!this.isEnabled) return;
    this.init();
    if (!this.ctx) return;

    const ctx = this.ctx;
    const notes = [622.25, 554.37, 466.16, 311.13];
    const t = ctx.currentTime;

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const time = t + i * 0.2;

      osc.type = 'triangle';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.3, time + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.9);
    });
  }
}

export const audioEngine = new AudioEngine();
