import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Store } from '@ngrx/store';
import {
  DepartmentAudioResultStreamData,
  DepartmentVoiceChannelResultData,
} from '@resgrid/ngx-resgridlib';
import { Observable, Subscription, timer } from 'rxjs';
import { AudioProvider } from 'src/app/providers/audio';
import {
  selectActiveStreamState,
  selectHomeState,
  selectSettingsState,
  selectVoiceState,
} from 'src/app/store';
import * as VoiceActions from '../../actions/voice.actions';
import { VoiceState } from '../../store/voice.store';
import {
  BitrateOptions,
  VgApiService,
} from '@videogular/ngx-videogular/core';
import { ModuloConfig } from '@videogular/ngx-videogular/modulo';
import * as _ from 'lodash';
import { SettingsState } from 'src/app/features/settings/store/settings.store';
import { HomeState } from 'src/app/features/home/store/home.store';

@Component({
  selector: 'app-voice-header',
  templateUrl: './voice-header.component.html',
  styleUrls: ['./voice-header.component.scss'],
})
export class VoiceFooterComponent implements OnInit, OnDestroy {
  public selectedChannel: DepartmentVoiceChannelResultData;
  public streams: DepartmentAudioResultStreamData[];
  public isTransmitting: boolean = false;
  public voiceState$: Observable<VoiceState | null>;
  public settingsState$: Observable<SettingsState | null>;
  public homeState$: Observable<HomeState | null>;

  private api: VgApiService;
  public url: string = '';
  public type: string = 'audio/mp4';
  public isPlayerHidden: boolean = true;
  public bitrates: BitrateOptions[];

  @ViewChild('media', { static: false }) media: ElementRef<HTMLAudioElement>;
  moduloConfig: ModuloConfig = {
    dimensions: {
      width: 200,
      height: 50,
    },
    fillStyle: 'black',
    strokeStyle: 'white',
    lineWidth: 1.5,
    scaleFactor: 0.8,
  };

  private participants: number = 0;
  private voiceSubscription: Subscription;
  private audioStreamSubscription: Subscription;

  constructor(
    private store: Store<VoiceState>,
    private audioProvider: AudioProvider,
    private ref: ChangeDetectorRef
  ) {
    this.voiceState$ = this.store.select(selectVoiceState);
    this.settingsState$ = this.store.select(selectSettingsState);
    this.homeState$ = this.store.select(selectHomeState);
    this.streams = [];
  }

  ngOnInit(): void {
    this.voiceSubscription = this.voiceState$.subscribe((state) => {
      if (state) {
        if (state.currentActiveVoipChannel) {
          this.selectedChannel = state.currentActiveVoipChannel;
        } else if (state.channels) {
          this.selectedChannel = state.channels[0];
        }

        this.isTransmitting = state.isTransmitting;

        if (this.participants !== state.participants) {
          this.ref.detectChanges();
          this.participants = state.participants;
        }
      }
    });

    this.audioStreamSubscription = this.store
      .select(selectActiveStreamState)
      .subscribe((audioStream) => {
        if (audioStream) {
          if (audioStream.Name !== 'Off') {
            this.api.pause();
            this.streams = [];

            const source = timer(1000, 2000);
            const timerSubscription: Subscription = source.subscribe(() => {
              this.streams.push(audioStream);
              this.api.play();
    
              timerSubscription.unsubscribe();
            });

            //this.api.play();
            this.isPlayerHidden = false;
          } else {
            this.api.pause();
            this.streams = [];
            this.isPlayerHidden = true;
          }
        }
      });
  }

  ngOnDestroy(): void {
    if (this.voiceSubscription) {
      this.voiceSubscription.unsubscribe();
      this.voiceSubscription = null;
    }

    if (this.audioStreamSubscription) {
      this.audioStreamSubscription.unsubscribe();
      this.audioStreamSubscription = null;
    }
  }

  onPlayerReady(api: VgApiService) {
    this.api = api;
  }

  public toggleTransmitting() {
    if (this.isTransmitting) {
      this.stopTransmitting();
    } else {
      this.startTransmitting();
    }
  }

  public startTransmitting(): void {
    if (this.selectedChannel.Id !== '') {
      this.audioProvider.playTransmitStart();
      this.store.dispatch(new VoiceActions.StartTransmitting());
    }
  }

  public stopTransmitting(): void {
    if (this.selectedChannel.Id !== '') {
      this.store.dispatch(new VoiceActions.StopTransmitting());
      this.audioProvider.playTransmitEnd();
    }
  }

  public onChannelChange(channel) {
    if (this.isTransmitting) {
      this.stopTransmitting();
    }

    if (channel.Id === '') {
      this.store.dispatch(new VoiceActions.SetNoChannel());
    } else {
      this.store.dispatch(new VoiceActions.SetActiveChannel(channel));
    }
  }

  public openPTT() {
    this.store.dispatch(new VoiceActions.ShowPTTPlugin());
  }

  public viewStreams() {
    this.store.dispatch(new VoiceActions.ShowAudioStreamModal());
  }

  public getPlayerWidth() {
    if (this.isPlayerHidden)
      return '0px';
    else
      return '200px';
  }
}
