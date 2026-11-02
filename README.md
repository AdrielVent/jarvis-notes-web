# Jarvis Notes (web)

Record a voice log and get organized notes. Speech is transcribed with Whisper running inside your browser; audio is never uploaded, and notes are saved only in your browser's storage. No accounts, API keys, or analytics.

- Live demo: https://adrielvent.github.io/jarvis-notes-web/
- Tip: the first transcription downloads a 40 MB model. Open the page once on Wi-Fi before presenting, or use **Settings → Load demo notes** for synthetic sample notes.

Run locally: `python3 -m http.server 8765` in this folder, then open http://localhost:8765.
Tests: `node --test tests/*.mjs`

Limits: English only; the smallest Whisper model mishears some words. Summaries, key points, and action items are selected from your own sentences by simple rules, not generated, so check them before sharing.

Credits and licenses: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). The wallpaper is original artwork; no third-party images are bundled.
