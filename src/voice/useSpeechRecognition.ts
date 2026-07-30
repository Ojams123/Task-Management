import { useCallback, useEffect, useRef, useState } from 'react'

export function useSpeechRecognition(onFinalTranscript: (transcript: string) => void) {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const SpeechRecognitionCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition
  const supported = !!SpeechRecognitionCtor

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort()
    }
  }, [])

  const start = useCallback(() => {
    if (!SpeechRecognitionCtor || listening) return

    const recognition = new SpeechRecognitionCtor()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      let finalText = ''
      let interimText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) finalText += result[0].transcript
        else interimText += result[0].transcript
      }
      setInterim(interimText)
      if (finalText) {
        onFinalTranscript(finalText.trim())
      }
    }

    recognition.onerror = (event) => {
      setError(event.error)
      setListening(false)
    }

    recognition.onend = () => {
      setListening(false)
      setInterim('')
    }

    recognitionRef.current = recognition
    setError(null)
    setListening(true)
    recognition.start()
  }, [SpeechRecognitionCtor, listening, onFinalTranscript])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  return { supported, listening, interim, error, start, stop }
}
