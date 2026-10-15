import { EqualizerBand } from '../types';

export const EQ_FREQUENCIES = [60, 230, 910, 3600, 14000];

export const EQ_PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0],
  'Bass Boost': [7, 4, 0, 0, 0],
  Vocal: [-2, 1, 5, 2, -1],
  Electronic: [5, 3, -1, 3, 5],
  Rock: [4, 2, -2, 3, 4],
  Acoustic: [3, 2, 1, 2, 3],
};

class AudioEffectsManager {
  private ctx: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private filterNodes: BiquadFilterNode[] = [];
  private analyserNode: AnalyserNode | null = null;
  private attachedElement: HTMLMediaElement | null = null;
  private isConnected = false;

  public init(mediaElement: HTMLMediaElement) {
    if (this.attachedElement === mediaElement && this.isConnected) {
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!this.ctx || this.ctx.state === 'closed') {
        this.ctx = new AudioCtx();
      }

      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }

      // If switching media elements
      if (this.sourceNode) {
        try {
          this.sourceNode.disconnect();
        } catch {}
      }

      this.attachedElement = mediaElement;
      this.sourceNode = this.ctx.createMediaElementSource(mediaElement);

      // Create 5-band Equalizer filters
      this.filterNodes = EQ_FREQUENCIES.map((freq) => {
        const filter = this.ctx!.createBiquadFilter();
        filter.type = freq <= 60 ? 'lowshelf' : freq >= 14000 ? 'highshelf' : 'peaking';
        filter.frequency.value = freq;
        filter.gain.value = 0;
        return filter;
      });

      // Gain node for volume boost (up to 200%)
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.value = 1.0;

      // Analyser node for dot-matrix visualizer
      this.analyserNode = this.ctx.createAnalyser();
      this.analyserNode.fftSize = 64;
      this.analyserNode.smoothingTimeConstant = 0.8;

      // Connect graph:
      // Source -> Filter 0 -> Filter 1 -> ... -> Filter 4 -> Gain -> Analyser -> Destination
      let currentNode: AudioNode = this.sourceNode;
      for (const filter of this.filterNodes) {
        currentNode.connect(filter);
        currentNode = filter;
      }

      currentNode.connect(this.gainNode);
      this.gainNode.connect(this.analyserNode);
      this.analyserNode.connect(this.ctx.destination);

      this.isConnected = true;
    } catch (e) {
      console.warn('AudioContext initialization deferred or restricted:', e);
    }
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  /**
   * Set volume gain boost (1.0 = 100%, 2.0 = 200%)
   */
  public setVolumeBoost(multiplier: number) {
    if (!this.gainNode || !this.ctx) return;
    const clamped = Math.max(0, Math.min(2.0, multiplier));
    this.gainNode.gain.setValueAtTime(clamped, this.ctx.currentTime);
  }

  /**
   * Set 5-band EQ gain
   */
  public setBandGain(bandIndex: number, gainDb: number) {
    if (!this.filterNodes[bandIndex] || !this.ctx) return;
    const clampedGain = Math.max(-12, Math.min(12, gainDb));
    this.filterNodes[bandIndex].gain.setValueAtTime(clampedGain, this.ctx.currentTime);
  }

  public applyPreset(presetName: string) {
    const gains = EQ_PRESETS[presetName];
    if (!gains) return;
    gains.forEach((gain, idx) => {
      this.setBandGain(idx, gain);
    });
  }

  public getVisualizerData(): Uint8Array {
    if (!this.analyserNode) {
      return new Uint8Array(16);
    }
    const bufferLength = this.analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyserNode.getByteFrequencyData(dataArray);
    return dataArray;
  }

  public cleanup() {
    try {
      if (this.sourceNode) this.sourceNode.disconnect();
      if (this.gainNode) this.gainNode.disconnect();
      if (this.analyserNode) this.analyserNode.disconnect();
      this.filterNodes.forEach((f) => f.disconnect());
      if (this.ctx && this.ctx.state !== 'closed') {
        this.ctx.close().catch(() => {});
      }
    } catch {}
    this.ctx = null;
    this.sourceNode = null;
    this.gainNode = null;
    this.analyserNode = null;
    this.filterNodes = [];
    this.attachedElement = null;
    this.isConnected = false;
  }
}

export const audioEffects = new AudioEffectsManager();
