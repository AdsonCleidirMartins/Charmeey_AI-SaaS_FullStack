import { useCallback, useEffect, useRef, useState } from 'react';

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; [index: number]: { transcript: string } }>;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export default function useSpeechRecognition() {
  const [supported] = useState(() => Boolean(getRecognition()));
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef('');

  const stop = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    rec.stop();
    recRef.current = null;
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const ctor = getRecognition();
    if (!ctor || recRef.current) return;
    const rec = new ctor();
    rec.lang = 'en-US';
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (event: SpeechRecognitionEventLike) => {
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const chunk = result[0]?.transcript || '';
        if (result.isFinal) {
          finalRef.current = finalRef.current ? `${finalRef.current.trim()} ${chunk.trim()}`.trim() : chunk.trim();
        } else {
          interimText += chunk;
        }
      }
      setInterim(interimText);
      setTranscript([finalRef.current, interimText].filter(Boolean).join(' '));
    };

    rec.onend = () => {
      recRef.current = null;
      setListening(false);
    };

    rec.onerror = () => {
      recRef.current = null;
      setListening(false);
    };

    recRef.current = rec;
    finalRef.current = '';
    setTranscript('');
    setInterim('');
    setListening(true);
    try {
      rec.start();
    } catch {
      recRef.current = null;
      setListening(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (recRef.current) {
        try {
          recRef.current.stop();
        } catch {
          /* ignore */
        }
      }
      recRef.current = null;
    };
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  const reset = useCallback(() => {
    finalRef.current = '';
    setTranscript('');
    setInterim('');
  }, []);

  return { supported, listening, transcript, interim, start, stop, toggle, reset };
}