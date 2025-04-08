import { useState, useRef } from 'react';
import { MicIcon, Loader2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VoiceSearchProps {
  onSearch: (query: string) => void;
  isSearching: boolean;
}

export function VoiceSearch({ onSearch, isSearching }: VoiceSearchProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  // Start recording audio
  const startRecording = async () => {
    setError(null);
    
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        // Create audio blob from recorded chunks
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        
        // Reset chunks for next recording
        chunksRef.current = [];
        
        // Send audio to server for processing
        processAudio(audioBlob);
      };
      
      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Could not access microphone. Please check permissions.');
      setIsRecording(false);
    }
  };
  
  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Stop all audio tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };
  
  // Process recorded audio
  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    
    try {
      // Create form data
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      // Send to server
      const response = await fetch('/api/openai/transcribe', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Failed to transcribe: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.text) {
        console.log('Transcribed text:', data.text);
        
        // Check if this is a fallback message
        if (data.fallback) {
          setError(data.text);
          setTimeout(() => setError(null), 5000); // Clear error after 5 seconds
        } else {
          // Pass to parent component for search
          onSearch(data.text);
        }
      } else {
        setError('Could not understand audio. Please try speaking clearly.');
      }
    } catch (err) {
      console.error('Error processing audio:', err);
      setError('Failed to process audio. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="relative">
      <Button
        type="button"
        variant={isRecording ? "destructive" : "ghost"}
        size="icon"
        className={`rounded-full transition-colors duration-200 ${isRecording ? 'animate-pulse' : ''}`}
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isProcessing || isSearching}
        title={isRecording ? "Stop recording" : "Search with voice"}
      >
        {isProcessing || isSearching ? (
          <Loader2Icon className="h-5 w-5 animate-spin" />
        ) : (
          <MicIcon className="h-5 w-5" />
        )}
      </Button>
      
      {error && (
        <div className="absolute top-full right-0 mt-2 bg-red-100 text-red-800 text-xs p-2 rounded shadow-lg w-48">
          {error}
        </div>
      )}
    </div>
  );
}