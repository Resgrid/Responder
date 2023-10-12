import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import * as SettingsActions from '../../../settings/actions/settings.actions';
import { HomeState } from 'src/app/features/home/store/home.store';
import { Observable } from 'rxjs';
import { selectHomeState, selectPushData, selectVoiceState } from 'src/app/store';
import { CallResultData, DepartmentAudioResultStreamData, DepartmentVoiceChannelResultData, UnitResultData } from '@resgrid/ngx-resgridlib';
import { take } from 'rxjs/operators';
import * as _ from 'lodash';
import { PushData } from 'src/app/models/pushData';
import { VoiceState } from '../../store/voice.store';
import * as VoiceActions from '../../actions/voice.actions';

@Component({
  selector: 'app-modal-voice-audioStreams',
  templateUrl: './modal-audioStreams.page.html',
  styleUrls: ['./modal-audioStreams.page.scss'],
})
export class ModalAudioStreams implements OnInit {
  public voiceState$: Observable<VoiceState | null>;
  public selectedChannel: DepartmentAudioResultStreamData;

  constructor(private modal: ModalController, private store: Store<HomeState>) {
    this.voiceState$ = this.store.select(selectVoiceState);
  }

  ngOnInit() {
    
  }

  public dismissModal() {
    this.modal.dismiss();
  }

  compareWith(o1: DepartmentAudioResultStreamData, o2: DepartmentAudioResultStreamData) {
    return o1 && o2 ? o1.Id === o2.Id : o1 === o2;
  }

  public set() {
    this.store.dispatch(new VoiceActions.SetActiveAudioStream(this.selectedChannel));
    this.modal.dismiss();
  }
}
