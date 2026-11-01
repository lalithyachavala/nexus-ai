# Nexus AI — Product Walkthrough

> Independent illustrative engineering demonstration. Synthetic data only.

**Rendered video:** [`nexus-ai-walkthrough.mp4`](./nexus-ai-walkthrough.mp4)
— 44 seconds, 1440×900, H.264. Recorded live against the running mock-mode app
with Playwright and encoded with ffmpeg (no mockups, no post-production).

---

## Video concept (30–60s)

A single continuous screen capture that follows one through-line: *"every
inbound message and every automated action, on one explainable plane."* We
move Overview → Support (watch the AI pipeline route a live message) → Sales
(explainable scoring) → WhatsApp → Automation (approve a gated run). Calm,
enterprise pacing; no fast cuts.

## Narration script (~44s, ~115 words)

> **Nexus AI** is an enterprise operations platform where support, sales, and
> messaging run on one AI pipeline.
>
> The overview gives leaders a single pulse — conversations, auto-resolution,
> pipeline value, and anything awaiting approval.
>
> In Support, watch a real message get classified, matched to business context,
> and routed — here, a frustrated complaint is escalated to a human, with the AI's
> reasoning shown on the right.
>
> Sales scores every lead *and explains why*, then suggests the next move — and
> you can re-score on demand.
>
> WhatsApp handles inbound messages with the same pipeline and approved templates.
>
> And Automation keeps humans in control — risky actions pause for approval before
> anything runs.

## Shot-by-shot storyboard

| # | Time | Screen | Action on screen | Narration beat |
|---|------|--------|------------------|----------------|
| 1 | 0:00–0:05 | Overview | Dashboard loads; KPIs + volume chart animate in | "…one AI pipeline." |
| 2 | 0:05–0:13 | AI Support | Open inbox; type a complaint; AI reply streams; pipeline panel shows intent → context → **human handoff** | "…classified, matched to context, and routed…" |
| 3 | 0:13–0:16 | Support · Analytics | Switch to Analytics tab; CSAT, auto-resolution, volume charts | (hold) |
| 4 | 0:16–0:24 | Sales Intelligence | Lead detail shows score ring + "Why this score" + AI follow-up | "…scores every lead and explains why…" |
| 5 | 0:24–0:27 | Sales | Click **Re-score**; score updates live | "…re-score on demand." |
| 6 | 0:27–0:30 | Sales · Pipeline | Conversion trend + pipeline-by-stage charts | (hold) |
| 7 | 0:30–0:37 | WhatsApp | Simulated inbox + message templates panel | "…same pipeline and approved templates." |
| 8 | 0:37–0:44 | Automation | Run detail shows step trace; click **Approve** on a gated run | "…risky actions pause for approval." |

## Recording / reproduction instructions

Everything is scripted and reproducible.

```bash
# 1. Run the web app in mock mode (zero backend needed)
cd apps/web
npm install
npm run build && npm start        # http://localhost:3000

# 2. In another terminal, install capture deps once
cd scripts
npm install
npx playwright install chromium

# 3. Screenshots → ../screenshots (8 PNGs)
npm run shots

# 4. Walkthrough video → ../demo/nexus-ai-walkthrough.mp4
npm run video                      # records webm, encodes MP4 via system ffmpeg
```

- `capture-screenshots.mjs` drives the app at 1440×900 @2x and writes 8 states.
- `capture-video.mjs` records a ~45s session, then shells out to `ffmpeg`
  (`-c:v libx264 -crf 20 -movflags +faststart`) to produce a shareable MP4.
- Set `BASE_URL` to target a different host.

**Suggested voiceover:** record the narration above with any TTS or your own
voice as a separate track, then mux:
`ffmpeg -i nexus-ai-walkthrough.mp4 -i voice.mp3 -c:v copy -c:a aac -shortest final.mp4`.
