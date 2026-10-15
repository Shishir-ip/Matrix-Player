import Hls from 'hls.js';
import dashjs from 'dashjs';
import mpegts from 'mpegts.js';
import { PlaybackEngineType, StreamQuality, AudioTrackInfo, PlayerStats } from '../types';

export interface EngineCallbacks {
  onQualityLevelsChanged?: (qualities: StreamQuality[]) => void;
  onAudioTracksChanged?: (tracks: AudioTrackInfo[]) => void;
  onError?: (errorMessage: string, isRecoverable: boolean) => void;
  onStatsUpdate?: (stats: PlayerStats) => void;
}

export class EngineManager {
  private videoElement: HTMLVideoElement | null = null;
  private currentEngineType: PlaybackEngineType = 'native';
  private hlsInstance: Hls | null = null;
  private dashInstance: dashjs.MediaPlayerClass | null = null;
  private mpegtsPlayer: mpegts.Player | null = null;
  private callbacks: EngineCallbacks = {};
  private statsInterval: number | null = null;
  private retryCount = 0;
  private maxRetries = 3;

  constructor(callbacks: EngineCallbacks) {
    this.callbacks = callbacks;
  }

  public attach(videoElement: HTMLVideoElement) {
    this.videoElement = videoElement;
    this.startStatsLoop();
  }

  public async loadSource(
    url: string,
    preferredEngine: PlaybackEngineType = 'native',
    customHeaders?: Record<string, string>
  ) {
    this.destroyEngines();
    if (!this.videoElement) return;

    this.currentEngineType = preferredEngine;
    this.retryCount = 0;

    try {
      switch (preferredEngine) {
        case 'hls':
          await this.initHls(url, customHeaders);
          break;
        case 'dash':
          await this.initDash(url);
          break;
        case 'mpegts':
          await this.initMpegts(url);
          break;
        case 'native':
        default:
          this.initNative(url);
          break;
      }
    } catch (err: any) {
      console.warn(`[Matrix Engine] Failed to load with ${preferredEngine}:`, err);
      // Fallback chain
      if (preferredEngine !== 'native') {
        console.log('[Matrix Engine] Falling back to native HTML5 video');
        this.currentEngineType = 'native';
        this.initNative(url);
      } else {
        this.callbacks.onError?.(err?.message || 'Playback failed', false);
      }
    }
  }

  private initNative(url: string) {
    if (!this.videoElement) return;
    this.videoElement.src = url;
    this.videoElement.load();
    this.callbacks.onQualityLevelsChanged?.([
      { id: -1, label: 'Default / Auto' },
    ]);
  }

  private async initHls(url: string, customHeaders?: Record<string, string>) {
    if (!this.videoElement) return;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        xhrSetup: (xhr) => {
          if (customHeaders) {
            Object.entries(customHeaders).forEach(([key, value]) => {
              xhr.setRequestHeader(key, value);
            });
          }
        },
      });

      this.hlsInstance = hls;
      hls.attachMedia(this.videoElement);

      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        hls.loadSource(url);
      });

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        const qualities: StreamQuality[] = [
          { id: -1, label: 'Auto' },
          ...data.levels.map((level, idx) => ({
            id: idx,
            label: level.height ? `${level.height}p` : `${Math.round(level.bitrate / 1000)}k`,
            bitrate: level.bitrate,
            width: level.width,
            height: level.height,
          })),
        ];
        this.callbacks.onQualityLevelsChanged?.(qualities);

        // Audio tracks
        if (hls.audioTracks && hls.audioTracks.length > 0) {
          this.callbacks.onAudioTracksChanged?.(
            hls.audioTracks.map((t, idx) => ({
              id: idx,
              name: t.name || `Track ${idx + 1}`,
              lang: t.lang,
            }))
          );
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                console.log(`[Matrix HLS] Network error, recovering (${this.retryCount}/${this.maxRetries})...`);
                hls.startLoad();
              } else {
                this.callbacks.onError?.('Network error or CORS restriction on stream', false);
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('[Matrix HLS] Media error, recovering...');
              hls.recoverMediaError();
              break;
            default:
              this.destroyEngines();
              this.initNative(url);
              break;
          }
        }
      });
    } else if (this.videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Apple HLS (Safari / iOS)
      this.initNative(url);
    } else {
      throw new Error('HLS is not supported in this browser');
    }
  }

  private async initDash(url: string) {
    if (!this.videoElement) return;
    const player = dashjs.MediaPlayer().create();
    this.dashInstance = player;

    player.initialize(this.videoElement, url, false);
    player.updateSettings({
      streaming: {
        buffer: {
          fastSwitchEnabled: true,
        },
      },
    });

    player.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
      const bitrates = player.getBitrateInfoListFor('video');
      const qualities: StreamQuality[] = [
        { id: -1, label: 'Auto' },
        ...bitrates.map((b, idx) => ({
          id: idx,
          label: b.height ? `${b.height}p` : `${Math.round(b.bitrate / 1000)}k`,
          bitrate: b.bitrate,
          width: b.width,
          height: b.height,
        })),
      ];
      this.callbacks.onQualityLevelsChanged?.(qualities);
    });

    player.on(dashjs.MediaPlayer.events.ERROR, (e: any) => {
      this.callbacks.onError?.(e?.error?.message || 'DASH playback error', true);
    });
  }

  private async initMpegts(url: string) {
    if (!this.videoElement) return;

    if (mpegts.getFeatureList().mseLivePlayback) {
      const isFlv = url.includes('.flv');
      const player = mpegts.createPlayer({
        type: isFlv ? 'flv' : 'mse',
        isLive: true,
        url: url,
      });

      this.mpegtsPlayer = player;
      player.attachMediaElement(this.videoElement);
      player.load();

      player.on(mpegts.Events.ERROR, (errType, errDetail) => {
        this.callbacks.onError?.(`MPEG-TS Error: ${errType} (${errDetail})`, false);
      });
    } else {
      throw new Error('MPEG-TS Live MSE is not supported');
    }
  }

  public setQuality(qualityId: number) {
    if (this.hlsInstance) {
      this.hlsInstance.currentLevel = qualityId; // -1 for auto
    } else if (this.dashInstance) {
      if (qualityId === -1) {
        this.dashInstance.updateSettings({ streaming: { abr: { autoSwitchBitrate: { video: true } } } });
      } else {
        this.dashInstance.updateSettings({ streaming: { abr: { autoSwitchBitrate: { video: false } } } });
        this.dashInstance.setQualityFor('video', qualityId);
      }
    }
  }

  public setAudioTrack(trackId: number) {
    if (this.hlsInstance) {
      this.hlsInstance.audioTrack = trackId;
    }
  }

  private startStatsLoop() {
    if (this.statsInterval) clearInterval(this.statsInterval);

    this.statsInterval = window.setInterval(() => {
      if (!this.videoElement) return;

      let bufferLen = 0;
      const ct = this.videoElement.currentTime;
      for (let i = 0; i < this.videoElement.buffered.length; i++) {
        if (this.videoElement.buffered.start(i) <= ct && ct <= this.videoElement.buffered.end(i)) {
          bufferLen = this.videoElement.buffered.end(i) - ct;
          break;
        }
      }

      let dropped = 0;
      let decoded = 0;
      if ((this.videoElement as any).getVideoPlaybackQuality) {
        const q = (this.videoElement as any).getVideoPlaybackQuality();
        dropped = q.droppedVideoFrames || 0;
        decoded = q.totalVideoFrames || 0;
      }

      let currentBitrate = 0;
      if (this.hlsInstance && this.hlsInstance.currentLevel >= 0) {
        const lvl = this.hlsInstance.levels[this.hlsInstance.currentLevel];
        if (lvl) currentBitrate = Math.round(lvl.bitrate / 1000);
      }

      const stats: PlayerStats = {
        engine: this.currentEngineType,
        resolution: `${this.videoElement.videoWidth || 0}x${this.videoElement.videoHeight || 0}`,
        currentBitrate,
        bufferLength: Math.round(bufferLen * 10) / 10,
        droppedFrames: dropped,
        decodedFrames: decoded,
      };

      this.callbacks.onStatsUpdate?.(stats);
    }, 1000);
  }

  public destroyEngines() {
    if (this.hlsInstance) {
      try {
        this.hlsInstance.destroy();
      } catch {}
      this.hlsInstance = null;
    }

    if (this.dashInstance) {
      try {
        this.dashInstance.reset();
      } catch {}
      this.dashInstance = null;
    }

    if (this.mpegtsPlayer) {
      try {
        this.mpegtsPlayer.pause();
        this.mpegtsPlayer.unload();
        this.mpegtsPlayer.detachMediaElement();
        this.mpegtsPlayer.destroy();
      } catch {}
      this.mpegtsPlayer = null;
    }

    if (this.videoElement) {
      this.videoElement.removeAttribute('src');
      this.videoElement.load();
    }
  }

  public destroy() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
    this.destroyEngines();
    this.videoElement = null;
  }
}
