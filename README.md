# Matrix Player

A high-end, bug-free, buttery-smooth video and media player app with a Nothing Phone / Nothing OS design language across all screens. Optimized for 60fps playback on Phones, Tablets, and Android TV.

## Design System (Nothing OS Dot-Matrix Aesthetic)
- **Palette**: Pure AMOLED Black `#000000`, surfaces `#0D0D0D` / `#141414`, 1px borders `#262626`, white text, secondary text `#8A8A8A`, signature accent Nothing Red `#D71921` for active states, LED indicators, and focus rings.
- **Typography**: 
  - `Doto`: Dot-matrix font for logo, large numerals, titles, and timers.
  - `Space Mono`: Monospace font for labels, metadata, and buttons.
  - `Space Grotesk`: Clean font for body text.
- **Signature Elements**:
  - Dot-matrix animated splash and logo.
  - Dot-matrix loading spinner and discrete circular LED ring.
  - Real-time dot-matrix audio visualizer driven by Web Audio `AnalyserNode`.
  - Dot-based seek, volume, and brightness sliders.
  - Glowing red LED glyph indicators and D-pad spatial focus rings.

## Supported Formats & Playback Engines
- **Native HTML5 Engine**: MP4 (H.264 / AAC), WebM (VP8 / VP9 / Opus), OGG, MP3, WAV, AAC, FLAC.
- **HLS.js Engine**: Adaptive HTTP Live Streaming (`.m3u8`), multi-bitrate quality levels, embedded audio track switching, live low-latency streams.
- **DASH.js Engine**: Dynamic Adaptive Streaming over HTTP (`.mpd`), adaptive bitrate (ABR), multi-resolution video.
- **MPEGTS.js Engine**: Live MPEG-TS (`.ts`) and HTTP-FLV (`.flv`) streams.
- **IPTV Playlists**: Import `.m3u` / `.m3u8` playlists with channel metadata, categories, and logos.

## Known Browser / Platform Notes
- **CORS Limitations on Web**: External network streams must allow Cross-Origin Resource Sharing (`Access-Control-Allow-Origin: *`). If an external stream server blocks cross-origin requests, configure the built-in CORS Proxy prefix in **Settings > CORS Proxy Relay**.
- **Autoplay Policies**: Browsers require user interaction before unmuted audio playback starts. Matrix Player resumes the Web Audio context smoothly on first user interaction.
- **Picture-in-Picture & Fullscreen**: Supported natively on supported desktop, tablet, and Android devices.
- **File System Access**: Chrome / Chromium-based browsers support folder selection via `showDirectoryPicker`. On other browsers, `webkitdirectory` provides folder import.
