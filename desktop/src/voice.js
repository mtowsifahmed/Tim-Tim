/* Voice layer: microphone capture (16 kHz PCM) with push-to-talk / hands-free / wake-phrase activation,
   sentence-by-sentence playback with barge-in, a "thinking" filler, and a live level.
   A recording is buffered on this PC and sent only when it ends, so clips that are too short or silent are dropped here
   (with a hint) instead of being sent to speech recognition, which tends to invent words like "Thank you" from silence. */
(function () {
  const TT = window.TT, V = TT.voice = { mode: 'ptt', wake: 'hey tim', speakReplies: true, micOn: false, recording: false, playing: false, micError: '', micLabel: '',
    deviceId: (() => { try { return localStorage.getItem('timtim.mic') || ''; } catch (_) { return ''; } })(),
    keepWarm: (() => { try { return localStorage.getItem('timtim.micwarm') !== '0'; } catch (_) { return true; } })() };
  const MIN_SECONDS = 0.4, MIN_PEAK = 0.012;
  let ctx, stream, src, proc, mute, analyser, outGain, floor = 0.004, loud = 0, quiet = 0, ring = [], utt = [], uttSamples = 0, uttPeak = 0, recStart = 0;
  let gotResponse = true, fillerT = null, pttWanted = false, idleT = null, meter = 0, lastPeak = 0, nextTime = 0, sources = new Set(), decoded = new Map(), nextSeq = 1, pendingDecode = 0, turnDone = true;

  async function audio() { if (!ctx) { ctx = new (window.AudioContext || window.webkitAudioContext)(); outGain = ctx.createGain(); analyser = ctx.createAnalyser(); analyser.fftSize = 512; outGain.connect(analyser); analyser.connect(ctx.destination); } if (ctx.state !== 'running') await ctx.resume(); return ctx; }

  // ───────── microphone ─────────
  async function openStream() {
    const base = { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 };
    try { return await navigator.mediaDevices.getUserMedia({ audio: V.deviceId ? { ...base, deviceId: { exact: V.deviceId } } : base }); }
    catch (e) {
      if (V.deviceId && (e.name === 'OverconstrainedError' || e.name === 'NotFoundError')) {          // the saved microphone is gone: use the default one
        V.deviceId = ''; try { localStorage.removeItem('timtim.mic'); } catch (_) {}
        return navigator.mediaDevices.getUserMedia({ audio: base });
      }
      throw e;
    }
  }
  V.startMic = async () => {
    clearTimeout(idleT); if (V.micOn) return true;
    try { await audio(); stream = await openStream(); }
    catch (e) { V.micError = e.name === 'NotAllowedError' || e.name === 'SecurityError' ? 'Microphone permission was denied. Allow it for this app and try again.' : e.name === 'NotFoundError' ? 'No microphone was found. Plug one in or pick another in Voice → Microphone.' : 'The microphone could not be started (' + (e.name || 'error') + ').'; TT.emit('mic', { error: V.micError }); return false; }
    const track = stream.getAudioTracks()[0]; V.micLabel = track ? track.label : '';
    if (track) { track.onended = () => { V.stopMic(); V.micError = 'The microphone was disconnected.'; TT.emit('mic', { error: V.micError }); }; track.onmute = () => TT.emit('mic', { muted: true }); track.onunmute = () => TT.emit('mic', { muted: false }); }
    src = ctx.createMediaStreamSource(stream); proc = ctx.createScriptProcessor(4096, 1, 1); mute = ctx.createGain(); mute.gain.value = 0;
    proc.onaudioprocess = onFrame; src.connect(proc); proc.connect(mute); mute.connect(ctx.destination); V.micOn = true; V.micError = ''; TT.emit('mic', { on: true }); return true;
  };
  V.stopMic = () => { clearTimeout(idleT); if (!V.micOn) return; try { proc.disconnect(); src.disconnect(); stream.getTracks().forEach(t => t.stop()); } catch (_) {} V.micOn = false; ring = []; if (V.recording) { V.recording = false; utt = []; TT.emit('rec', { on: false }); } TT.emit('mic', { on: false }); };
  const scheduleIdleClose = () => { clearTimeout(idleT); if (V.mode === 'ptt' && !V.keepWarm && V.micOn) idleT = setTimeout(() => { if (!V.recording) V.stopMic(); }, 15000); };

  function pcm16k(f) {
    const ratio = ctx.sampleRate / 16000, n = Math.floor(f.length / ratio), out = new Int16Array(n);
    for (let i = 0; i < n; i++) { const a = Math.floor(i * ratio), b = Math.min(f.length, Math.floor((i + 1) * ratio)); let s = 0; for (let j = a; j < b; j++) s += f[j]; const v = Math.max(-1, Math.min(1, s / Math.max(1, b - a))); out[i] = v < 0 ? v * 0x8000 : v * 0x7fff; }
    return out;
  }
  function onFrame(e) {
    const f = e.inputBuffer.getChannelData(0); let sum = 0, pk = 0; for (let i = 0; i < f.length; i++) { const x = f[i]; sum += x * x; const a = x < 0 ? -x : x; if (a > pk) pk = a; }
    const rms = Math.sqrt(sum / f.length); meter = rms; lastPeak = pk; const chunk = pcm16k(f); chunk.peak = pk;
    if (V.recording) {
      utt.push(chunk); uttSamples += chunk.length; if (pk > uttPeak) uttPeak = pk;
      if (V.mode !== 'ptt') { if (rms < Math.max(0.012, floor * 2.5)) { quiet++; if (quiet * f.length / ctx.sampleRate > 0.95) endUtterance(); } else quiet = 0; }
      if (Date.now() - recStart > 58000) endUtterance(); return;
    }
    ring.push(chunk); if (ring.length > 5) ring.shift();
    if (V.mode === 'ptt' || TT.paused) return;
    floor = floor * 0.97 + rms * 0.03 * (loud ? 0 : 1);
    const thr = V.playing ? Math.max(0.06, floor * 6) : Math.max(0.018, floor * 3.2);          // harder to trigger while Tim-Tim is talking (echo)
    if (rms > thr) { loud++; if (loud >= (V.playing ? 3 : 2)) { loud = 0; beginUtterance(true); } } else loud = 0;
  }

  function beginUtterance(withPre) {
    if (V.recording || TT.paused) return;
    if (V.playing || !turnDone) V.interrupt();                                                    // barge-in: stop talking the moment you speak
    V.recording = true; quiet = 0; recStart = Date.now();
    utt = withPre ? ring.slice() : []; uttSamples = utt.reduce((n, c) => n + c.length, 0); uttPeak = utt.reduce((m, c) => Math.max(m, c.peak || 0), 0); ring = [];
    TT.emit('rec', { on: true });
  }
  function endUtterance() {
    if (!V.recording) return; V.recording = false; TT.emit('rec', { on: false });
    const secs = uttSamples / 16000, peak = uttPeak, chunks = utt; utt = []; uttSamples = 0; uttPeak = 0; scheduleIdleClose();
    const held = (Date.now() - recStart) / 1000;                                                    // the pre-roll doesn't count: judge how long the key was really held
    if (secs < MIN_SECONDS || (V.mode === 'ptt' && held < 0.3)) { TT.emit('rec_discard', { reason: 'short', secs: held }); return; }
    if (peak < MIN_PEAK) { TT.emit('rec_discard', { reason: 'quiet', peak }); return; }
    if (!TT.net.ready()) { TT.emit('rec_discard', { reason: 'offline' }); return; }
    TT.net.send({ type: 'audio_start' });
    const all = new Int16Array(uttSamples = chunks.reduce((n, c) => n + c.length, 0)); let o = 0; chunks.forEach(c => { all.set(c, o); o += c.length; }); uttSamples = 0;
    for (let i = 0; i < all.length; i += 16000) TT.net.sendBinary(all.slice(i, i + 16000).buffer);
    TT.net.send({ type: 'audio_end', ...(V.mode === 'wake' ? { wake: V.wake } : {}) });
    gotResponse = false; turnDone = false; clearTimeout(fillerT); fillerT = setTimeout(() => { if (!gotResponse) V.filler(); }, 1000);
  }

  /* Push-to-talk. If you let go while the microphone is still starting (first use, permission prompt) nothing gets stuck recording. */
  V.pttStart = async () => {
    if (TT.paused) return; pttWanted = true;
    if (!(await V.startMic())) { pttWanted = false; return; }
    if (!pttWanted) { TT.emit('rec_discard', { reason: 'notready' }); return; }           // let go before the microphone finished starting
    if (V.recording) return;
    beginUtterance(true);                                                                         // includes the last fraction of a second so the first word isn't clipped
  };
  V.pttStop = () => { pttWanted = false; if (V.recording) endUtterance(); else scheduleIdleClose(); };
  V.setMode = async m => { V.mode = m; if (m === 'ptt') { if (V.recording) endUtterance(); scheduleIdleClose(); } else await V.startMic(); TT.emit('voicemode', m); };
  V.setKeepWarm = async on => { V.keepWarm = !!on; try { localStorage.setItem('timtim.micwarm', on ? '1' : '0'); } catch (_) {} if (on && V.mode === 'ptt') await V.startMic(); else scheduleIdleClose(); };
  V.noteResponse = () => { gotResponse = true; clearTimeout(fillerT); };
  V.turnStarted = () => { turnDone = false; gotResponse = false; };
  V.turnFinished = () => { turnDone = true; checkEnd(); };

  // ───────── devices + test ─────────
  V.listDevices = async () => { try { return (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'audioinput'); } catch (_) { return []; } };
  V.setDevice = async id => { V.deviceId = id || ''; try { id ? localStorage.setItem('timtim.mic', id) : localStorage.removeItem('timtim.mic'); } catch (_) {} if (V.micOn) { V.stopMic(); await V.startMic(); } };
  V.testMic = async (ms = 2500) => {
    if (!(await V.startMic())) return { ok: false, error: V.micError };
    let peak = 0; const t0 = Date.now();
    await new Promise(res => { const iv = setInterval(() => { peak = Math.max(peak, lastPeak); if (Date.now() - t0 > ms) { clearInterval(iv); res(); } }, 40); });
    scheduleIdleClose(); return { ok: true, peak, label: V.micLabel };
  };

  // ───────── playback ─────────
  V.onAudio = async ({ meta, bytes }) => {
    V.noteResponse(); if (!V.speakReplies) return; await audio(); pendingDecode++; V.playing = true;
    try { decoded.set(meta.seq, await ctx.decodeAudioData(bytes.slice(0))); } catch (_) { decoded.set(meta.seq, null); }
    pendingDecode--; drain();
  };
  function drain() {
    while (decoded.has(nextSeq)) {
      const buf = decoded.get(nextSeq); decoded.delete(nextSeq); nextSeq++; if (!buf) continue;
      const s = ctx.createBufferSource(); s.buffer = buf; s.connect(outGain); const t = Math.max(ctx.currentTime + 0.04, nextTime); s.start(t); nextTime = t + buf.duration;
      sources.add(s); s.onended = () => { sources.delete(s); checkEnd(); };
    }
  }
  function checkEnd() { if (sources.size === 0 && pendingDecode === 0 && decoded.size === 0 && turnDone && V.playing) { V.playing = false; nextSeq = 1; nextTime = 0; TT.emit('speech_end'); } }
  V.interrupt = () => {
    sources.forEach(s => { try { s.onended = null; s.stop(); } catch (_) {} }); sources.clear(); decoded.clear(); nextSeq = 1; nextTime = 0; pendingDecode = 0;
    const was = V.playing || !turnDone; V.playing = false; turnDone = true; clearTimeout(fillerT); if (was) TT.net.send({ type: 'interrupt' }); TT.emit('speech_end');
  };
  V.resetPlayback = () => { nextSeq = 1; decoded.clear(); };
  V.level = () => { if (!analyser || !V.playing) return 0; const d = new Uint8Array(analyser.fftSize); analyser.getByteTimeDomainData(d); let s = 0; for (const x of d) { const v = (x - 128) / 128; s += v * v; } return Math.min(1, Math.sqrt(s / d.length) * 3.2); };
  V.micLevel = () => Math.min(1, meter * 9);

  // soft "mm" while thinking, generated locally (costs no provider quota)
  V.filler = async () => { if (!V.speakReplies) return; await audio(); const o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain(), t = ctx.currentTime;
    o.type = 'sine'; o.frequency.setValueAtTime(165, t); o.frequency.linearRampToValueAtTime(190, t + 0.35); lp.type = 'lowpass'; lp.frequency.value = 700;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07, t + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45); o.connect(lp); lp.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 0.5); };
  V.unlock = () => audio();
})();
