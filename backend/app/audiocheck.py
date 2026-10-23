"""Guards against speech-to-text 'hallucinations': speech models invent phrases like 'Thank you.' when they are
given silence or a very quiet recording. We measure the audio first and drop obvious silence before spending STT quota."""
from __future__ import annotations

import re
from array import array

# Normalized phrases Whisper-style models are known to invent from near-silence.
PHANTOMS = {"thank you", "thanks", "thank you very much", "thanks for watching", "thank you for watching", "thank you so much", "you", "bye", "bye bye",
            "goodbye", "ok", "okay", "so", "yeah", "the end", "hmm", "um", "uh", "please subscribe", "subtitles by the amaraorg community",
            "transcribed by", "i'll see you in the next video", "see you in the next video"}


def levels(pcm: bytes) -> tuple[float, float]:
    """(rms, peak) of 16-bit mono PCM, each 0..1."""
    n = len(pcm) // 2
    if n == 0:
        return 0.0, 0.0
    a = array("h"); a.frombytes(pcm[: n * 2])
    step = max(1, n // 40000)                       # sample the clip; plenty for a level estimate
    vals = a[::step]
    peak = max(abs(v) for v in vals) / 32768
    rms = (sum(v * v for v in vals) / len(vals)) ** 0.5 / 32768
    return rms, peak


def is_silence(rms: float, peak: float) -> bool:
    """Nothing speech-like in the clip: don't even send it to the STT provider."""
    return peak < 0.02 or rms < 0.0035


def looks_hallucinated(text: str, seconds: float, rms: float) -> bool:
    """A stock phantom phrase from a quiet clip. A clearly spoken 'thank you' (normal loudness) is kept."""
    norm = re.sub(r"[^a-z' ]", "", (text or "").lower().replace(".", "")).strip()
    norm = re.sub(r"\s+", " ", norm)
    return norm in PHANTOMS and (rms < 0.015 or (seconds < 0.9 and rms < 0.025))
