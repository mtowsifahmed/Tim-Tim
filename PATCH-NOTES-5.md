# PC patch 5: microphone fixes, faster replies, "made by Zaftan Studios"

Apply patches 1 to 4 first (in order). This patch REPLACES four files that patches 3/4 and earlier added and adds new ones.

## Apply (3 minutes)
1. Extract into your project folder (the one with `backend` and `desktop`), say yes to overwrite.
2. In that folder run:  `python apply_patch_5.py`   (small safe edits to 5 files, `.bak` backups, skips anything you changed)
3. In `backend`:  `.venv\Scripts\python -m pytest -q`   then restart the backend (`run-backend.bat`) and reload the app.

## 1. Microphone
What was wrong:
- **Space bar did nothing**: a bug in the key handler made it work only while the Settings panel was open. Fixed.
- **"Thank you" every time**: if you let go early, the old recorder could stay open and send a long silent clip, and speech models invent
  "Thank you." from silence. Now a recording is kept on your PC and sent only when you release the key; clips that are too short or
  silent are dropped with a clear message, and the server also refuses silent audio and drops phantom "thank you"-style phrases from very quiet clips.
- Letting go while the mic is still starting no longer leaves it stuck.
New in the **Voice** tab: pick your microphone, **Test microphone** (live level meter and a clear verdict), and **Keep microphone ready**
(on by default: the mic stays open, nothing is recorded or sent, so your first word is never clipped; turn it off if you prefer).
If it still hears nothing: Windows Settings → Privacy & security → Microphone → allow apps/desktop apps, and check your headset's mute switch.

## 2. Identity
Tim-Tim now says it was created by **Zaftan Studios** and never names Gemini, Google, NVIDIA, OpenAI, Meta etc. as its maker.
If asked what model powers it, it says it is Tim-Tim from Zaftan Studios running on a mix of AI models. It still says plainly that it is an AI.
Change the name any time with `COMPANY_NAME=...` in `backend\.env`. A model can occasionally slip; if you ever see that, tell me.

## 3. Speed
- Fastest providers first: AI = Groq, Cerebras, then Gemini; speech recognition = Groq Whisper first; voice = Deepgram first (Gemini's models are accurate but slow).
  Change the order in `.env` with `LLM_PRIORITY`, `STT_PRIORITY`, `TTS_PRIORITY` (see `.env.example`).
- Before the AI even started, each message made about nine database round-trips; the plan, user and settings lookups are now cached for a few seconds.
- Memory search no longer makes a network call when you only have a few facts.
- The first spoken piece can start at a comma, and replies are told to be brief (about 1 to 3 sentences) unless you ask for detail.
- The backend log now prints `first word after N ms` for every reply, so you can see the real delay.

## Files
New: `backend\app\audiocheck.py` · `backend\app\speed.py` · `backend\tests\test_speed_identity.py` · `desktop\src\micsettings.js` · `apply_patch_5.py`
Replaced: `backend\app\agents.py` · `backend\app\chunker.py` · `backend\app\memory_store.py` · `desktop\src\voice.js`
Edited by the script: `desktop\src\app.js` · `desktop\src\index.html` · `backend\app\ws.py` · `backend\app\main.py` · `backend\.env.example`
