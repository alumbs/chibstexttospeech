import {
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
        <textarea
          name="text"
          [(ngModel)]="msg"
          (change)="textChanged$.next()"
        ></textarea>
        
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

        textarea {
          height: 20rem;
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
export class SpeechTextComponent implements OnInit, OnDestroy {
    @ViewChild('stop', { static: true, read: ElementRef })
    btnStop!: ElementRef<HTMLButtonElement>;

    @ViewChild('speak', { static: true, read: ElementRef })
    btnSpeak!: ElementRef<HTMLButtonElement>;

    @ViewChild('pause', { static: true, read: ElementRef })
    btnPause!: ElementRef<HTMLButtonElement>;

    textChanged$ = new Subject<void>();
    subscription = new Subscription();
    msg = 'Hello! I love JavaScript 👍';
    isPaused$: Observable<boolean>;
    isSpeaking$: Observable<boolean>;
    progress$: Observable<number>;

    constructor(private speechService2: SpeechService) {
        this.isPaused$ = this.speechService2.isPaused$;
        this.isSpeaking$ = this.speechService2.isSpeaking$;
        this.progress$ = this.speechService2.progress$;
    }

    ngOnInit(): void {
        this.speechService2.updateSpeech({ name: 'text', value: this.msg });

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
            this.textChanged$.pipe(tap(() => this.speechService2.updateSpeech({ name: 'text', value: this.msg }))).subscribe(),
        );
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