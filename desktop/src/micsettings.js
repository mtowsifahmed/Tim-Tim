/* Microphone controls in Settings-style form inside the Voice tab: choose the microphone, test it, keep it ready,
   plus clear on-screen hints when a recording is too short or silent. */
(function () {
  const TT = window.TT, V = TT && TT.voice; if (!V) return;
  const pane = document.getElementById('as-voice'); if (!pane) return;
  const css = document.createElement('style');
  css.textContent = '#as-voice>*{flex-shrink:0}.micbox{padding:12px;border-radius:12px;background:var(--input);border:1px solid var(--card-b);margin-bottom:6px}.micbox select{width:100%;margin-bottom:8px}.micbox .meter{height:8px;border-radius:9px;background:var(--card-b);overflow:hidden;margin:10px 0 6px}.micbox .meter i{display:block;height:100%;width:0;background:linear-gradient(90deg,#10b981,#f59e0b,#ef4444);transition:width .06s}.micbox .row{padding:6px 0 0}.micbox .ok{color:#34d399}.micbox .bad{color:#fb7185}';
  document.head.appendChild(css);
  const box = document.createElement('div'); box.innerHTML = '<h4>Microphone</h4><div class="micbox"><select id="mic-dev"><option value="">Default microphone</option></select><button class="ghost" id="mic-test">Test microphone</button><div class="meter"><i id="mic-meter"></i></div><p class="hint" id="mic-msg">Press Test and say something.</p>' +
    '<label class="row">Keep microphone ready<div class="seg" id="seg-warm"><button data-v="on">On</button><button data-v="off">Off</button></div></label></div>';
  pane.insertBefore(box, pane.querySelector('h4'));
  const $ = s => box.querySelector(s), say = (t, c) => { const m = $('#mic-msg'); m.textContent = t; m.className = 'hint ' + (c || ''); };
  async function fill() {
    const devs = await V.listDevices(), sel = $('#mic-dev'); sel.innerHTML = '<option value="">Default microphone</option>';
    devs.forEach((d, i) => { const o = document.createElement('option'); o.value = d.deviceId; o.textContent = d.label || ('Microphone ' + (i + 1)); if (d.deviceId === V.deviceId) o.selected = true; sel.appendChild(o); });
  }
  $('#mic-dev').addEventListener('change', async e => { await V.setDevice(e.target.value); say('Microphone changed. Press Test to check it.'); });
  $('#mic-test').addEventListener('click', async () => {
    say('Listening… say something for two seconds.'); const r = await V.testMic(2500); await fill();
    if (!r.ok) { say(r.error || 'The microphone could not be started.', 'bad'); return; }
    if (r.peak < 0.02) say('No sound detected from "' + (r.label || 'the microphone') + '". Check that the right microphone is selected, that it is not muted (Windows Settings → Privacy → Microphone, and any mute switch on your headset), then test again.', 'bad');
    else if (r.peak < 0.08) say('I can hear you, but very quietly. Move closer or raise the input volume in Windows sound settings.', '');
    else say('I can hear you clearly ✓  (' + (r.label || 'microphone') + ')', 'ok');
  });
  const seg = $('#seg-warm'), mark = () => seg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === (V.keepWarm ? 'on' : 'off')));
  seg.addEventListener('click', async e => { const b = e.target.closest('button'); if (!b) return; await V.setKeepWarm(b.dataset.v === 'on'); mark(); }); mark();
  setInterval(() => { $('#mic-meter').style.width = (V.micOn ? Math.round(V.micLevel() * 100) : 0) + '%'; }, 60);
  document.getElementById('as-tabs').addEventListener('click', e => { if (e.target.dataset && e.target.dataset.tab === 'voice') fill(); });
  // keep the microphone ready: start it after the first click/key press once you are signed in (browsers only allow audio after a gesture)
  const warm = () => { if (V.keepWarm && V.mode === 'ptt' && !V.micOn && TimAuth.getToken && TimAuth.getToken()) { V.startMic().then(ok => ok && fill()); return true; } return false; };
  const gesture = () => { if (V.micOn || warm()) { ['pointerdown', 'keydown'].forEach(ev => removeEventListener(ev, gesture)); } };
  ['pointerdown', 'keydown'].forEach(ev => addEventListener(ev, gesture));
  TT.on('ready', async () => { try { const st = await navigator.permissions.query({ name: 'microphone' }); if (st.state === 'granted') warm(); } catch (_) {} });
  function hint(text) { const log = document.getElementById('log'); if (!log) return; const d = document.createElement('div'); d.className = 'm err'; d.innerHTML = '<div class="bub"></div>'; d.firstChild.textContent = text; log.appendChild(d); log.scrollTop = log.scrollHeight; }
  TT.on('rec_discard', m => hint(m.reason === 'notready' ? 'The microphone was still starting up. Hold Space again and start speaking after a moment.' : m.reason === 'short' ? 'That was too short. Hold Space (or the mic button) the whole time you speak, then let go.'
    : m.reason === 'quiet' ? 'I could not hear any sound. Open the Voice tab and press "Test microphone" to check your microphone.' : 'Not connected to the server yet, so I could not send that.'));
  TT.on('mic', m => { if (m.muted) hint('Your microphone looks muted. Unmute it (headset switch or Windows sound settings) and try again.'); });
})();
