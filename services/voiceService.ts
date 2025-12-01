import { IWindow } from '../types';

export class VoiceService {
  private recognition: any;
  private isListening: boolean = false;
  private shouldBeListening: boolean = false; // Intended state
  private ignoreInput: boolean = false; // Soft mute
  private onResultCallback: ((transcript: string) => void) | null = null;

  constructor() {
    const win = window as unknown as IWindow;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true; // Keep listening
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event: any) => {
        if (this.ignoreInput) return;

        // Iterate only over the new results using resultIndex
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            const transcript = event.results[i][0].transcript.trim().toLowerCase();
            console.log("Voice Input:", transcript);
            if (this.onResultCallback) {
              this.onResultCallback(transcript);
            }
          }
        }
      };

      this.recognition.onerror = (event: any) => {
        // Ignore 'no-speech' errors as they are common and benign
        if (event.error !== 'no-speech') {
             console.warn('Speech recognition error', event.error);
        }
        
        if (event.error === 'not-allowed') {
            this.shouldBeListening = false;
            this.isListening = false;
        }
      };

      // Chrome automatically stops recognition after a while or network idle.
      // We use onend to restart it if it *should* be listening.
      this.recognition.onend = () => {
        this.isListening = false;
        if (this.shouldBeListening) {
          console.log("Voice service restarting...");
          try {
            this.recognition.start();
            this.isListening = true;
          } catch (e) {
            // Ignore restart errors
          }
        }
      };
    } else {
      console.warn('Speech Recognition API not supported in this browser.');
    }
  }

  public setIgnoreInput(ignore: boolean) {
      this.ignoreInput = ignore;
  }

  public start(onResult: (transcript: string) => void) {
    this.onResultCallback = onResult;
    this.shouldBeListening = true;

    if (!this.recognition) return;
    
    // Only try to start if we think we aren't listening
    if (!this.isListening) {
      try {
        this.recognition.start();
        this.isListening = true;
        console.log("Voice service started");
      } catch (e: any) {
        // Handle "already started" explicitly
        if (e.name === 'InvalidStateError' || (e.message && e.message.includes('already started'))) {
            this.isListening = true; // Sync state
        } else {
            console.error("Voice start error", e);
        }
      }
    }
  }

  public stop() {
    this.shouldBeListening = false;
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
      console.log("Voice service stopped");
    }
  }
}

export const voiceService = new VoiceService();