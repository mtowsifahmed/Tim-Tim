# Tim-Tim: Complete Project Summary & Architecture Guide

> **Author / Organization:** Zaftan Studios (M Towsif Ahmed)  
> **Repository:** [https://github.com/mtowsifahmed/Tim-Tim.git](https://github.com/mtowsifahmed/Tim-Tim.git)  
> **Version:** `1.0.0` (Production Release)  
> **Status:** Backend Tests Passed (130/130) • Cloud APK Build Succeeded (CI Run 39936177857)

---

## 1. Executive Summary

**Tim-Tim** is an agentic AI voice companion engineered to run on a **$0 zero-cost stack**. It provides cross-platform voice interaction, desktop automation, spatial awareness, and a mobile companion interface. 

The application architecture spans:
1. **Desktop App:** Built with Tauri 2 + Rust + Vanilla JS/HTML/CSS, featuring a 3D Canvas orb, desktop system automation skills, and floating companion widget.
2. **Backend Engine:** High-performance FastAPI server running LangGraph sub-agents, multi-provider voice pipeline (STT/LLM/TTS), Supabase PostgreSQL with Row Level Security (RLS), and encrypted BYOK key storage.
3. **Mobile Android App:** Flutter companion app wrapping the hosted Tim-Tim web interface with native microphone hardware access, custom navigation, and offline PWA support.
4. **Cloud Infrastructure:** Render automated deployment (`render.yaml`) and GitHub Actions CI for automated APK building.

---

## 2. What Was Done & Improvements Made

### A. Official Branding & Visual Identity
- **New Official Orb Logo:** Integrated the high-definition glowing purple/blue energy orb across every platform.
- **Desktop Assets:** Replaced default icons with multi-resolution Tauri bundles (`icon.ico`, `icon.icns`, `128x128.png`, `32x32.png`) and web header logos (`desktop/src/logo.png`, `desktop/src/app-icon.png`).
- **Android Mipmap Assets:** Generated direct Android icon assets across all screen densities (`mipmap-mdpi`, `mipmap-hdpi`, `mipmap-xhdpi`, `mipmap-xxhdpi`, `mipmap-xxxhdpi`).
- **UI Branding:** Updated the sign-in modal, header navigation, chat assistant bubble, and floating companion orb to display official Zaftan Studios branding.

### B. Backend Engine & Voice Pipeline (Patches 1 to 5)
- **Patch 1 & 2 (Desktop Automation Skills):**
  - Added 22 native system automation skills (file/folder management, web search, clipboard access, media/volume controls, lock screen, scheduled voice reminders).
  - Sub-agent permission isolation: sub-agents only get authorized capabilities; destructive actions require explicit user confirmation.
- **Patch 3 & 4 (Self-Healing Multi-Provider Rotation):**
  - Configured 5 free-tier voice & LLM providers: **Google Gemini**, **Groq Whisper**, **Cloudflare Workers AI**, **ElevenLabs**, and **Deepgram**, plus zero-dependency **Edge-TTS** fallback.
  - Per-model fallback ladders with automatic rotation on rate-limits (HTTP 429).
  - AES-GCM BYOK (Bring Your Own Key) encrypted storage.
- **Patch 5 (Audio Silence Guard & Speed Optimizations):**
  - Added `backend/app/audiocheck.py` silence guard to drop silent microphone packets, eliminating hallucination and conserving API quotas.
  - Fixed Spacebar Push-to-Talk (PTT) state sync in `voice.js` and `app.js`.
  - Added `backend/app/speed.py` pre-warmed audio connections and reduced chunk streaming latency.
  - Identity locked to **Zaftan Studios** across system prompts.
  - **130/130 backend test suite passed**.

### C. Mobile Android App & GitHub Actions CI Build
- **Flutter Companion (`mobile/`):**
  - Native WebView client pre-configured with Android hardware permissions (`android.permission.RECORD_AUDIO`, `INTERNET`, `MODIFY_AUDIO_SETTINGS`).
  - Added mobile navigation bottom bar with World, Core, and Chat view toggles.
  - Resolved panel bleed-through and duplicate message rendering.
- **Fixed CI/CD Build Errors:**
  - Resolved the `PathNotFoundException: ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-20x20@1x.png` and alpha warning by scoping the project to **Android-only**.
  - Removed obsolete `flutter_launcher_icons` step from CI and batch scripts.
  - Android launcher icons are copied directly into Android mipmap directories.
  - **APK Cloud Build Status:** Succeeded on GitHub Actions run [#39936177857](https://github.com/mtowsifahmed/Tim-Tim/actions/runs/39936177857).
  - **Download Artifact:** `Tim-Tim-Release-APK` (25.8 MB ready for Android installation).

### D. Repository Cleanup
- Removed temporary and waste files:
  - Deleted duplicate backup files (`.bak`), `.pytest_cache`, `.freebuff`, and temporary build scaffolds.
  - Deleted obsolete `mobile/.flutter-plugins-dependencies`.
  - Updated `.gitignore` to prevent generated and temporary files from cluttering Git.

---

## 3. Project Structure

```
Tim-Tim/
├── .github/
│   └── workflows/
│       └── build-apk.yml       # Cloud GitHub Actions workflow building Android APK
├── backend/
│   ├── app/
│   │   ├── agents.py           # LangGraph sub-agents
│   │   ├── audiocheck.py       # Silence detector & audio validation
│   │   ├── config.py           # Environment and server configuration
│   │   ├── hub.py              # WebSocket broadcast & device sync hub
│   │   ├── main.py             # FastAPI entrypoint
│   │   ├── providers/          # Gemini, Groq, Cloudflare, ElevenLabs, Deepgram
│   │   ├── routes/             # Authentication, admin, memory, keys, turn APIs
│   │   ├── skills.py           # Computer control skills (files, search, reminders)
│   │   ├── speed.py            # Latency reduction & pre-warming
│   │   └── ws.py               # Real-time WebSocket audio streaming
│   ├── providers.yaml          # Fallback ladders and free-tier limits
│   ├── requirements.txt        # Python dependencies
│   └── tests/                  # 130 automated unit and integration tests
├── desktop/
│   ├── src/                    # Frontend client (HTML5, JS, CSS, PWA service worker)
│   │   ├── actions.js          # Desktop action dispatch
│   │   ├── app.js              # State manager and UI controllers
│   │   ├── logo.png            # Official glowing orb logo
│   │   ├── manifest.webmanifest# Progressive Web App manifest
│   │   ├── orb.js              # 3D Canvas companion orb
│   │   └── sw.js               # Service Worker for offline / PWA install
│   └── src-tauri/              # Rust desktop backend for system hooks & native window
├── mobile/
│   ├── android/                # Native Android platform project
│   ├── assets/                 # App icons
│   ├── lib/main.dart           # Flutter WebView app
│   └── tools/prepare_android.py# Manifest injection tool
├── render.yaml                 # 1-click cloud backend deployment on Render
└── supabase/
    └── migrations/             # Database schema, RLS policies, and key storage
```

---

## 4. How to Download the Android APK

You do not need to install Android Studio or Flutter on your PC. The APK was compiled in the cloud:

1. Open your browser and go to:  
   **[https://github.com/mtowsifahmed/Tim-Tim/actions/runs/39936177857](https://github.com/mtowsifahmed/Tim-Tim/actions/runs/39936177857)**
2. Scroll to the bottom under **Artifacts**.
3. Click **`Tim-Tim-Release-APK`** to download the ZIP file containing `app-release.apk`.
4. Transfer `app-release.apk` to your Android device, tap to install (enable "Install unknown apps" when prompted), and launch!

---

## 5. How to Run Locally

### Running the Python Backend
```cmd
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Or double-click `run-backend.bat`.

### Running the Desktop App
```cmd
run-desktop.bat
```
*(Requires Rust toolchain installed on Windows).*

### Building the Mobile APK Locally (Optional)
If you ever want to build the APK on your machine rather than GitHub Actions:
1. Ensure Flutter is installed and added to `PATH`.
2. Run `build-mobile.bat`.
3. The APK will be copied to `release\Tim-Tim.apk`.
