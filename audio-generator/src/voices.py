from __future__ import annotations

from dataclasses import asdict, dataclass

DEFAULT_VOICE_ID = "af_heart"
QWEN_CUSTOM_BACKEND_ID = "qwen-0.6b-custom"
QWEN_CUSTOM_DEFAULT_SPEAKER = "Ryan"


@dataclass(frozen=True)
class Voice:
    id: str
    name: str
    lang_code: str
    language: str
    gender: str
    grade: str | None = None
    backend: str = "kokoro"


VOICES = [
    Voice("af_heart", "Heart", "a", "American English", "female", "A"),
    Voice("af_alloy", "Alloy", "a", "American English", "female", "C"),
    Voice("af_aoede", "Aoede", "a", "American English", "female", "C+"),
    Voice("af_bella", "Bella", "a", "American English", "female", "A-"),
    Voice("af_jessica", "Jessica", "a", "American English", "female", "D"),
    Voice("af_kore", "Kore", "a", "American English", "female", "C+"),
    Voice("af_nicole", "Nicole", "a", "American English", "female", "B-"),
    Voice("af_nova", "Nova", "a", "American English", "female", "C"),
    Voice("af_river", "River", "a", "American English", "female", "D"),
    Voice("af_sarah", "Sarah", "a", "American English", "female", "C+"),
    Voice("af_sky", "Sky", "a", "American English", "female", "C-"),
    Voice("am_adam", "Adam", "a", "American English", "male", "F+"),
    Voice("am_echo", "Echo", "a", "American English", "male", "D"),
    Voice("am_eric", "Eric", "a", "American English", "male", "D"),
    Voice("am_fenrir", "Fenrir", "a", "American English", "male", "C+"),
    Voice("am_liam", "Liam", "a", "American English", "male", "D"),
    Voice("am_michael", "Michael", "a", "American English", "male", "C+"),
    Voice("am_onyx", "Onyx", "a", "American English", "male", "D"),
    Voice("am_puck", "Puck", "a", "American English", "male", "C+"),
    Voice("am_santa", "Santa", "a", "American English", "male", "D-"),
    Voice("bf_alice", "Alice", "b", "British English", "female", "D"),
    Voice("bf_emma", "Emma", "b", "British English", "female", "B-"),
    Voice("bf_isabella", "Isabella", "b", "British English", "female", "C"),
    Voice("bf_lily", "Lily", "b", "British English", "female", "D"),
    Voice("bm_daniel", "Daniel", "b", "British English", "male", "D"),
    Voice("bm_fable", "Fable", "b", "British English", "male", "C"),
    Voice("bm_george", "George", "b", "British English", "male", "C"),
    Voice("bm_lewis", "Lewis", "b", "British English", "male", "D+"),
    Voice("jf_alpha", "Alpha", "j", "Japanese", "female", "C+"),
    Voice("jf_gongitsune", "Gongitsune", "j", "Japanese", "female", "C"),
    Voice("jf_nezumi", "Nezumi", "j", "Japanese", "female", "C-"),
    Voice("jf_tebukuro", "Tebukuro", "j", "Japanese", "female", "C"),
    Voice("jm_kumo", "Kumo", "j", "Japanese", "male", "C-"),
    Voice("zf_xiaobei", "Xiaobei", "z", "Mandarin Chinese", "female", "D"),
    Voice("zf_xiaoni", "Xiaoni", "z", "Mandarin Chinese", "female", "D"),
    Voice("zf_xiaoxiao", "Xiaoxiao", "z", "Mandarin Chinese", "female", "D"),
    Voice("zf_xiaoyi", "Xiaoyi", "z", "Mandarin Chinese", "female", "D"),
    Voice("zm_yunjian", "Yunjian", "z", "Mandarin Chinese", "male", "D"),
    Voice("zm_yunxi", "Yunxi", "z", "Mandarin Chinese", "male", "D"),
    Voice("zm_yunxia", "Yunxia", "z", "Mandarin Chinese", "male", "D"),
    Voice("zm_yunyang", "Yunyang", "z", "Mandarin Chinese", "male", "D"),
    Voice("ef_dora", "Dora", "e", "Spanish", "female"),
    Voice("em_alex", "Alex", "e", "Spanish", "male"),
    Voice("em_santa", "Santa", "e", "Spanish", "male"),
    Voice("ff_siwis", "SIWIS", "f", "French", "female", "B-"),
    Voice("hf_alpha", "Alpha", "h", "Hindi", "female", "C"),
    Voice("hf_beta", "Beta", "h", "Hindi", "female", "C"),
    Voice("hm_omega", "Omega", "h", "Hindi", "male", "C"),
    Voice("hm_psi", "Psi", "h", "Hindi", "male", "C"),
    Voice("if_sara", "Sara", "i", "Italian", "female", "C"),
    Voice("im_nicola", "Nicola", "i", "Italian", "male", "C"),
    Voice("pf_dora", "Dora", "p", "Brazilian Portuguese", "female"),
    Voice("pm_alex", "Alex", "p", "Brazilian Portuguese", "male"),
    Voice("pm_santa", "Santa", "p", "Brazilian Portuguese", "male"),
    Voice("Ryan", "Ryan", "en", "English", "male", backend=QWEN_CUSTOM_BACKEND_ID),
    Voice("Aiden", "Aiden", "en", "English", "male", backend=QWEN_CUSTOM_BACKEND_ID),
]


def list_voices() -> list[dict[str, str | None]]:
    return [asdict(voice) for voice in VOICES]
