import { useCallback, useEffect, useRef, useState } from 'react'

// How long to wait after the user stops producing new speech results before
// treating the command as finished. This is what actually fixes "cut off
// during pauses" — recognition.continuous keeps the mic open through short
// gaps, and this timer (not the engine's own much shorter built-in cutoff)
// decides when the user is really done talking.
const SILENCE_TIMEOUT_MS = 2500

export function useSpeechRecognition(onFinalTranscript: (transcript: string) => void) {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const finalBufferRef = useRef('')
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onFinalTranscriptRef = useRef(onFinalTranscript)
  onFinalTranscriptRef.current = onFinalTranscript

  const SpeechRecognitionCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition
  const supported = !!SpeechRecognitionCtor

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      clearSilenceTimer()
      recognitionRef.current?.abort()
    }
  }, [])

  const start = useCallback(() => {
    if (!SpeechRecognitionCtor || listening) return

    const recognition = new SpeechRecognitionCtor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    finalBufferRef.current = ''

    recognition.onresult = (event) => {
      let interimText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalBufferRef.current = `${finalBufferRef.current} ${result[0].transcript}`.trim()
        } else {
          interimText += result[0].transcript
        }
      }
      setInterim(interimText)
      // Any new result (interim or final) means the user is still talking —
      // push the "are they done?" decision back out instead of relying on
      // the engine's own short pause-detection to end the session.
      clearSilenceTimer()
      silenceTimerRef.current = setTimeout(() => recognition.stop(), SILENCE_TIMEOUT_MS)
    }

    recognition.onerror = (event) => {
      setError(event.error)
      setListening(false)
      clearSilenceTimer()
    }

    recognition.onend = () => {
      setListening(false)
      setInterim('')
      clearSilenceTimer()
      const text = finalBufferRef.current.trim()
      finalBufferRef.current = ''
      if (text) onFinalTranscriptRef.current(text)
    }

    recognitionRef.current = recognition
    setError(null)
    setListening(true)
    recognition.start()
  }, [SpeechRecognitionCtor, listening])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  return { supported, listening, interim, error, start, stop }
}
