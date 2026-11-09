# PharmaSetu AI narrated demonstration

The generated `demo-video/PharmaSetu-AI-Demo.mp4` records actual browser interactions with the corrected local production preview, **not the public Netlify deployment**. A persistent recording banner and the narration identify the local preview and synthetic data. The video covers all seven modules, the KPI definitions, stock validation and receipt, coverage statuses, expiry filters, a draft-to-approved request workflow, CSV export and reset cancellation.

- English male synthetic voice: offline Flite **RMS**, through the installed FFmpeg `flite` filter. This is computer-generated speech, not a human voice actor or imitation of a named person.
- MP4 video: H.264, 1600×900, AAC audio, embedded selectable English captions.
- Sidecars: `demo-video/captions.srt`, `transcript.txt`, `narration.wav`, `timing.json` and the exported demonstration CSV.
- Media is intentionally ignored by Git to avoid pushing large generated files. The recording source is committed.

## Reproduce in the prepared Linux environment

```sh
npm ci --cache .npm-cache
npm run build
npm run preview -- --port 4180
# In a second terminal at repository root:
PLAYWRIGHT_BROWSERS_PATH=.browser-cache npm run demo:record
```

The prepared environment has `/usr/bin/chromium` and `/usr/bin/ffmpeg`. The optional `CHROMIUM_PATH` and `APP_URL` variables can select a different browser and running preview. **Use an isolated local preview URL; do not use an authenticated operational system.** The recorder operates in a disposable context and does not access an existing personal profile.

Playwright normally installs its video encoder with `PLAYWRIGHT_BROWSERS_PATH=.browser-cache npm exec -- playwright install ffmpeg`. Its download CDN was blocked by the current network policy. For this recording, the existing trusted system FFmpeg was used instead, via a symlink in the ignored browser cache. No downloaded artifact or TLS verification was bypassed:

```sh
# Revision must match the ffmpeg entry in node_modules/playwright-core/browsers.json.
mkdir -p .browser-cache/ffmpeg-1013
ln -s /usr/bin/ffmpeg .browser-cache/ffmpeg-1013/ffmpeg-linux
```

This cache link is machine-local and is not a project dependency. On another machine use Playwright's normal encoder installer or an installed compatible FFmpeg. The source constructs measured scene timing, generates narration locally, records clicks, filters and form entries, then assembles the video, audio and captions. No external voice API, credential, music licence or paid service is required. Browser console/page errors abort the normal regression tests; page errors also fail the recorder.

## Produced artifact

The completed recording is **3 minutes 11 seconds**, approximately 8.1 MB (7.7 MiB), at 1,600×900. FFprobe verified H.264 video, AAC audio and a caption stream. The complete MP4 decoded without errors; an extracted frame was visually reviewed and audio analysis confirmed a non-silent, unclipped narration track. The generated transcript and external SRT are available beside the MP4. Captions use approximate sentence timing; enable the subtitle track in your video player.
