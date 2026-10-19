# Tim-Tim (by Claude)

Agentic AI voice companion: desktop (Tauri 2) + mobile (Flutter) + FastAPI backend + Supabase. $0 stack.

## Status
Done: Supabase schema + RLS, backend (login verification, roles, daily caps, provider rotation with per-model ladders + self-healing model discovery, BYOK keys that walk their own provider's ladder, admin API,
voice turns with interrupt, LangGraph agents, memory, settings sync, phone pairing and relay, world feeds),
5 free-tier voice providers (Gemini, Cloudflare Workers AI, Groq Whisper/Orpheus, ElevenLabs Scribe/premade voices, Deepgram) with a keyless edge-tts fallback,
desktop command center UI
(sphere/figure orb, live map, agent studio, assistant panel, voice layer, registry-driven API-keys screen, admin, memory, skills, pairing QR),
Tauri commands for confirmed computer actions, floating orb window.
Not done yet: the Flutter phone app (backend side is ready), typing/clicking skills, partial-transcript streaming STT.
Not compiled here: the Tauri/Rust app (no Rust toolchain in this sandbox). Everything else has automated tests (57 backend tests, browser tests).

Start with **START-HERE.md**. Provider limits: **README-PROVIDERS.md**. Recent-changes summary for agents: **HANDOFF.md**.
