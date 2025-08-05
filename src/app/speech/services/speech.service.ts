import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SpeechProperties } from '../interfaces/speech.interface';

@Injectable({
    providedIn: 'root'
})
export class SpeechService {
    private voices: SpeechSynthesisVoice[] = [];
    private isSpeaking = new BehaviorSubject<boolean>(false);
    private isPaused = new BehaviorSubject<boolean>(false);
    private progress = new BehaviorSubject<number>(0);
    private currentWordIndex = new BehaviorSubject<number>(-1);
    
    // Expose observables for components to subscribe to
    readonly isSpeaking$ = this.isSpeaking.asObservable();
    readonly isPaused$ = this.isPaused.asObservable();
    readonly progress$ = this.progress.asObservable();
    readonly currentWordIndex$ = this.currentWordIndex.asObservable();
    
    constructor(private ngZone: NgZone) {}

    updateSpeech(property: SpeechProperties): void {
        const { name, value } = property;
        localStorage.setItem(name, value);
        this.toggle();
    }

    setVoices(voices: SpeechSynthesisVoice[]): void {
        this.voices = voices;
    }

    updateVoice(voiceName: string): void {
        localStorage.setItem('voice', voiceName);
        this.toggle();
    }

    private findVoice(voiceName: string): SpeechSynthesisVoice | null {
        const voice = this.voices.find((v) => v.name === voiceName);
        return voice ? voice : null;
    }

    toggle(startOver = true): void {
        // If we're paused and trying to speak, just resume
        if (this.isPaused.value && startOver) {
            this.resume();
            return;
        }
        
        const speech = this.makeRequest();
        speechSynthesis.cancel();
        
        if (startOver) {
            speechSynthesis.speak(speech);
            this.isSpeaking.next(true);
            this.isPaused.next(false);
        } else {
            this.isSpeaking.next(false);
            this.isPaused.next(false);
        }
    }

    pause(): void {
        if (speechSynthesis.speaking && !speechSynthesis.paused) {
            speechSynthesis.pause();
            this.isPaused.next(true);
        }
    }
    
    resume(): void {
        if (speechSynthesis.speaking && speechSynthesis.paused) {
            speechSynthesis.resume();
            this.isPaused.next(false);
        }
    }
    
    private makeRequest() {
        const speech = new SpeechSynthesisUtterance();
        speech.text = localStorage.getItem('text') || '';
        speech.rate = +(localStorage.getItem('rate') || '1');
        speech.pitch = +(localStorage.getItem('pitch') || '1');
        const voice = this.findVoice(localStorage.getItem('voice') || '');
        if (voice) {
            speech.voice = voice;
        }
        
        const textLength = speech.text.length;
        
        // Add event listeners to track speech status and progress
        speech.onstart = () => {
            this.ngZone.run(() => {
                this.progress.next(0);
                this.currentWordIndex.next(0);
            });
        };
        
        speech.onboundary = (event) => {
            this.ngZone.run(() => {
                if (textLength > 0) {
                    const progressPercent = (event.charIndex / textLength) * 100;
                    this.progress.next(Math.min(progressPercent, 100));
                    
                    // Calculate word index from character index
                    const textUpToIndex = speech.text.substring(0, event.charIndex);
                    const wordIndex = textUpToIndex.trim().split(/\s+/).length - 1;
                    this.currentWordIndex.next(Math.max(0, wordIndex));
                }
            });
        };
        
        speech.onend = () => {
            this.ngZone.run(() => {
                this.isSpeaking.next(false);
                this.isPaused.next(false);
                this.progress.next(100);
                this.currentWordIndex.next(-1);
                // Reset progress after a short delay
                setTimeout(() => {
                    this.progress.next(0);
                    this.currentWordIndex.next(-1);
                }, 1000);
            });
        };
        
        speech.onerror = () => {
            this.ngZone.run(() => {
                this.isSpeaking.next(false);
                this.isPaused.next(false);
                this.progress.next(0);
                this.currentWordIndex.next(-1);
            });
        };
        
        return speech;
    }
}