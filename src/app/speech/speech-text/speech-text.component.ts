import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    OnDestroy,
    OnInit,
    ViewChild,
} from '@angular/core';
import { Subject, Subscription, fromEvent, map, merge, tap, Observable } from 'rxjs';
import { SpeechService } from '../services/speech.service';

@Component({
    selector: 'app-speech-text',
    template: `
      <ng-container>
        <div
          #textArea
          class="speech-text-area"
          contenteditable="true"
          [innerHTML]="highlightedText"
          (input)="onInput($event)"
          (blur)="onBlur()"
          spellcheck="true"
        ></div>
        
        <!-- Progress Bar -->
        <div class="progress-container" *ngIf="(isSpeaking$ | async) || (progress$ | async)! > 0">
          <div class="progress-label">Reading Progress</div>
          <div class="progress-bar">
            <div class="progress-fill" [style.width.%]="progress$ | async">
              <div class="progress-shine"></div>
            </div>
            <div class="progress-text">{{ (progress$ | async)?.toFixed(0) }}%</div>
          </div>
        </div>
        
        <button id="stop" #stop>Stop!</button>
        <button id="speak" #speak>Speak</button>
        <button id="pause" #pause>{{ (isPaused$ | async) ? 'Resume' : 'Pause' }}</button>
      </ng-container>
    `,
    styles: [
        `
        :host {
          display: block;
        }

        button,
        textarea {
          width: 100%;
          display: block;
          margin: 10px 0;
          padding: 10px;
          border: 0;
          font-size: 2rem;
          background: #f7f7f7;
          outline: 0;
        }

        .speech-text-area {
          height: 20rem;
          width: 100%;
          display: block;
          margin: 10px 0;
          padding: 10px;
          border: 0;
          font-size: 2rem;
          background: #f7f7f7;
          outline: 0;
          overflow-y: auto;
          white-space: pre-wrap;
          word-break: break-word;
          min-height: 120px;
          max-height: 40vh;
        }
        .highlight-current-word {
          background: #ff9800 !important;
          color: #222 !important;
          border-radius: 4px;
          padding: 0 2px;
          font-weight: bold;
          box-shadow: 0 0 6px 2px #ffa726;
          border: 2px solid #e65100;
          text-shadow: 0 1px 1px #fff, 0 0 2px #e65100;
        }

        button {
          background: #ffc600;
          border: 0;
          width: 32%;
          float: left;
          font-family: 'Pacifico', cursive;
          margin-bottom: 0;
          font-size: 2rem;
          border-bottom: 5px solid #f3c010;
          cursor: pointer;
          position: relative;
        }

        button:active {
          top: 2px;
        }

        button:not(:last-of-type) {
          margin-right: 2%;
        }
        
        /* Progress Bar Styles */
        .progress-container {
          margin: 20px 0;
          animation: fadeIn 0.3s ease-in;
        }
        
        .progress-label {
          font-size: 1.2rem;
          color: #333;
          margin-bottom: 8px;
          font-weight: 500;
          text-align: center;
        }
        
        .progress-bar {
          position: relative;
          width: 100%;
          height: 20px;
          background: linear-gradient(90deg, #f0f0f0 0%, #e0e0e0 100%);
          border-radius: 25px;
          overflow: hidden;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
          border: 2px solid #ddd;
        }
        
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #4CAF50 0%, #45a049 50%, #66bb6a 100%);
          border-radius: 25px;
          transition: width 0.3s ease;
          position: relative;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
        }
        
        .progress-shine {
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%);
          animation: shine 2s infinite;
        }
        
        .progress-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 0.9rem;
          font-weight: bold;
          color: #333;
          text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.8);
          z-index: 10;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes shine {
          0% {
            left: -100%;
          }
          100% {
            left: 100%;
          }
        }
      `,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpeechTextComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('stop', { static: true, read: ElementRef })
    btnStop!: ElementRef<HTMLButtonElement>;

    @ViewChild('speak', { static: true, read: ElementRef })
    btnSpeak!: ElementRef<HTMLButtonElement>;

    @ViewChild('pause', { static: true, read: ElementRef })
    btnPause!: ElementRef<HTMLButtonElement>;

    @ViewChild('textArea', { static: true, read: ElementRef })
    textArea!: ElementRef<HTMLDivElement>;

    textChanged$ = new Subject<void>();
    subscription = new Subscription();
    msg = 'Hello! I love JavaScript 👍';
    highlightedText = '';
    isPaused$: Observable<boolean>;
    isSpeaking$: Observable<boolean>;
    progress$: Observable<number>;
    currentWordIndex$: Observable<number>;
    currentWordIndex = -1;

    constructor(private speechService2: SpeechService) {
        this.isPaused$ = this.speechService2.isPaused$;
        this.isSpeaking$ = this.speechService2.isSpeaking$;
        this.progress$ = this.speechService2.progress$;
        this.currentWordIndex$ = this.speechService2.currentWordIndex$;
    }

    ngOnInit(): void {
        this.speechService2.updateSpeech({ name: 'text', value: this.msg });
        this.updateHighlightedText();

        const btnStop$ = fromEvent(this.btnStop.nativeElement, 'click').pipe(
            map(() => false)
        );
        const btnSpeak$ = fromEvent(this.btnSpeak.nativeElement, 'click').pipe(
            map(() => true)
        );
        this.subscription.add(
            merge(btnStop$, btnSpeak$)
                .pipe(tap(() => this.speechService2.updateSpeech({ name: 'text', value: this.msg })))
                .subscribe((startOver) => this.speechService2.toggle(startOver)),
        );

        this.subscription.add(
            fromEvent(this.btnPause.nativeElement, 'click')
                .subscribe(() => {
                    this.togglePauseResume();
                })
        );

        this.subscription.add(
            this.textChanged$.pipe(tap(() => {
                this.speechService2.updateSpeech({ name: 'text', value: this.msg });
                this.updateHighlightedText();
            })).subscribe(),
        );
    }

    ngAfterViewInit(): void {
        // Subscribe to current word index changes for highlight
        this.subscription.add(
            this.currentWordIndex$.subscribe(wordIndex => {
                this.currentWordIndex = wordIndex;
                this.updateHighlightedText();
            })
        );
    }

    private updateHighlightedText(): void {
        // Debug: log currentWordIndex
        console.log('Current word index:', this.currentWordIndex);
        // Split the text into words and wrap the current word in a span
        const words = this.msg.split(/(\s+)/); // Keep spaces as tokens
        let html = '';
        let wordCounter = 0;
        for (let i = 0; i < words.length; i++) {
            if (!words[i].trim()) {
                html += words[i];
            } else {
                if (wordCounter === this.currentWordIndex) {
                    html += `<span class="highlight-current-word">${this.escapeHtml(words[i])}</span>`;
                } else {
                    html += this.escapeHtml(words[i]);
                }
                wordCounter++;
            }
        }
        this.highlightedText = html;
        // Ensure scroll runs after DOM updates
        setTimeout(() => this.scrollCurrentWordIntoView(), 0);
    }

    private escapeHtml(text: string): string {
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    private scrollCurrentWordIntoView(): void {
        // Scroll the highlighted word into view if needed
        const container = this.textArea.nativeElement;
        const highlight = container.querySelector('.highlight-current-word') as HTMLElement;
        if (highlight) {
            const containerRect = container.getBoundingClientRect();
            const highlightRect = highlight.getBoundingClientRect();
            if (highlightRect.top < containerRect.top || highlightRect.bottom > containerRect.bottom) {
                highlight.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
            }
        }
    }

    onInput(event: Event): void {
        // Update msg from contenteditable div (strip HTML)
        const text = (event.target as HTMLElement).innerText;
        this.msg = text;
        this.textChanged$.next();
    }

    onBlur(): void {
        // Ensure model stays in sync with view
        this.updateHighlightedText();
    }

    togglePauseResume(): void {
        this.isPaused$.pipe(
            tap(isPaused => {
                if (isPaused) {
                    this.speechService2.resume();
                } else {
                    this.speechService2.pause();
                }
            }),
        ).subscribe();
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }
}