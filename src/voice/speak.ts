// Shared text-to-speech for the assistant's spoken replies and voice-command
// confirmations. Picks the best available female English voice from whatever
// the OS/browser has installed — there's no way to synthesize a voice that
// isn't already provided by the platform's speech engine. Gender is weighted
// above accent (a female voice in any English accent beats a male one, even
// a "more correct" British male), since many devices only expose a single
// non-US English voice and it's frequently male (e.g. "Daniel" on iOS/iPadOS
// Safari, which — unlike the OS's own Accessibility voice picker — only
// surfaces a small legacy voice list to web content).
const FEMALE_NAME_HINTS = [
  'female', 'serena', 'kate', 'hazel', 'martha', 'stephanie', 'emily', 'fiona', 'amy', 'olivia', 'sonia', 'libby',
  'karen', 'moira', 'samantha', 'tessa', 'victoria', 'catherine', 'susan',
]
const MALE_NAME_HINTS = ['male', 'daniel', 'arthur', 'george', 'oliver', 'ryan']

function scoreVoice(voice: SpeechSynthesisVoice): number {
  const lang = voice.lang?.toLowerCase() ?? ''
  const name = voice.name?.toLowerCase() ?? ''
  if (!lang.startsWith('en')) return -100

  let score = 0
  if (lang === 'en-gb') score += 3
  else if (lang === 'en-us') score += 1
  else score += 2 // en-AU, en-IE, en-NZ, en-ZA, etc — a non-US accent, just not the ideal GB one

  if (FEMALE_NAME_HINTS.some((hint) => name.includes(hint))) score += 10
  if (MALE_NAME_HINTS.some((hint) => name.includes(hint))) score -= 10
  if (name.includes('karen')) score += 1 // explicit tie-break — the voice picked for this setup

  return score
}

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve([])
      return
    }
    const existing = window.speechSynthesis.getVoices()
    if (existing.length > 0) {
      resolve(existing)
      return
    }
    const handleChange = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handleChange)
      resolve(window.speechSynthesis.getVoices())
    }
    window.speechSynthesis.addEventListener('voiceschanged', handleChange)
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1000)
  })
}

let cachedVoice: SpeechSynthesisVoice | null | undefined

async function preferredVoice(): Promise<SpeechSynthesisVoice | null> {
  if (cachedVoice !== undefined) return cachedVoice
  const voices = await loadVoices()
  const ranked = voices.map((v) => ({ v, score: scoreVoice(v) })).sort((a, b) => b.score - a.score)
  cachedVoice = ranked.length > 0 && ranked[0].score > -100 ? ranked[0].v : null
  return cachedVoice
}

// Debug helper for diagnosing "wrong voice" reports — lists every voice the
// browser can see (name/lang, ranked) plus which one the picker chose, so a
// mismatch between "I downloaded voice X" and "the app can't see it" is
// visible directly instead of guessed at.
export async function debugListVoices(): Promise<{ name: string; lang: string; score: number }[]> {
  cachedVoice = undefined
  const voices = await loadVoices()
  return voices
    .map((v) => ({ name: v.name, lang: v.lang, score: scoreVoice(v) }))
    .sort((a, b) => b.score - a.score)
}

const MUTE_KEY = 'devicehub.voiceMuted'

export function isVoiceMuted(): boolean {
  return localStorage.getItem(MUTE_KEY) === '1'
}

export function setVoiceMuted(muted: boolean) {
  localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
}

// iOS/iPadOS Safari only reliably allows speechSynthesis to produce audio
// close to a real user gesture (tap/click) — a single one-shot "unlock" call
// doesn't survive a long async wait (e.g. a multi-round-trip Managed Agent
// reply), so audio silently never plays. Keeping the engine continuously
// busy with near-silent utterances from the moment of the tap onward — each
// one queuing the next as soon as it ends — keeps that gesture association
// alive for as long as the reply takes, instead of letting it lapse.
let warmupActive = false
// When a real reply becomes ready while the warmup chain is still pumping,
// it's handed off here instead of being spoken directly. A "cold" speak()
// call from an unrelated React effect (e.g. after an async assistant
// round-trip) has no gesture association on iOS Safari and gets silently
// dropped — but a speak() call made synchronously from inside another
// utterance's onend handler stays part of the same chain the original tap
// started, so it reliably plays. Pending handoff, one at a time.
let pendingSpeak: (() => void) | null = null

function pumpWarmup() {
  if (pendingSpeak) {
    const run = pendingSpeak
    pendingSpeak = null
    run()
    return
  }
  if (!warmupActive || !('speechSynthesis' in window)) return
  const utterance = new SpeechSynthesisUtterance('.')
  // Not truly 0 — iOS appears to treat a fully silent (volume 0) utterance as
  // a no-op it can skip without ever engaging the audio session, which would
  // make this chain pump through instantly without actually keeping anything
  // "warm." A tiny but nonzero volume forces it to really play, so the
  // gesture-linked audio session stays genuinely alive for the handoff below.
  utterance.volume = 0.01
  utterance.onend = pumpWarmup
  utterance.onerror = pumpWarmup
  window.speechSynthesis.speak(utterance)
}

export function startVoiceWarmup() {
  if (!('speechSynthesis' in window) || isVoiceMuted() || warmupActive) return
  warmupActive = true
  pumpWarmup()
}

export function stopVoiceWarmup() {
  warmupActive = false
  pendingSpeak = null
}

export async function speak(text: string) {
  if (!text.trim() || !('speechSynthesis' in window) || isVoiceMuted()) {
    stopVoiceWarmup()
    return
  }
  const voice = await preferredVoice()
  const doSpeak = () => {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    if (voice) {
      utterance.voice = voice
      utterance.lang = voice.lang
    } else {
      utterance.lang = 'en-GB'
    }
    // Lets any avatar/UI listen for speaking state without prop drilling —
    // same event-based pattern as the httpClient's devicehub:unauthorized.
    utterance.onstart = () => window.dispatchEvent(new CustomEvent('devicehub:speaking-start'))
    utterance.onend = () => window.dispatchEvent(new CustomEvent('devicehub:speaking-end'))
    utterance.onerror = () => window.dispatchEvent(new CustomEvent('devicehub:speaking-end'))
    window.speechSynthesis.speak(utterance)
  }
  if (warmupActive) {
    warmupActive = false
    pendingSpeak = doSpeak
  } else {
    doSpeak()
  }
}
