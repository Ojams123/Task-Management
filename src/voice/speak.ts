// Shared text-to-speech for the assistant's spoken replies and voice-command
// confirmations. Picks the best available British English female voice from
// whatever the OS/browser has installed — there's no way to synthesize an
// accent that isn't already provided by the platform's speech engine.

const FEMALE_NAME_HINTS = [
  'female', 'serena', 'kate', 'hazel', 'martha', 'stephanie', 'emily', 'fiona', 'amy', 'olivia', 'sonia', 'libby',
]
const MALE_NAME_HINTS = ['male', 'daniel', 'arthur', 'george', 'oliver', 'ryan']

function scoreVoice(voice: SpeechSynthesisVoice): number {
  const lang = voice.lang?.toLowerCase() ?? ''
  const name = voice.name?.toLowerCase() ?? ''
  let score = 0
  if (lang === 'en-gb') score += 10
  else if (lang.startsWith('en-gb')) score += 8
  else if (lang.startsWith('en')) score += 1
  else return -100

  if (FEMALE_NAME_HINTS.some((hint) => name.includes(hint))) score += 5
  if (MALE_NAME_HINTS.some((hint) => name.includes(hint))) score -= 5
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

const MUTE_KEY = 'devicehub.voiceMuted'

export function isVoiceMuted(): boolean {
  return localStorage.getItem(MUTE_KEY) === '1'
}

export function setVoiceMuted(muted: boolean) {
  localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
}

export async function speak(text: string) {
  if (!text.trim() || !('speechSynthesis' in window) || isVoiceMuted()) return
  const utterance = new SpeechSynthesisUtterance(text)
  const voice = await preferredVoice()
  if (voice) {
    utterance.voice = voice
    utterance.lang = voice.lang
  } else {
    utterance.lang = 'en-GB'
  }
  window.speechSynthesis.speak(utterance)
}
