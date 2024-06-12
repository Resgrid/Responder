import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { CallsState } from '../../store/calls.store';
import { Observable, take } from 'rxjs';
import { selectCallsState, selectSettingsState } from 'src/app/store';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ResgridConfig } from '@resgrid/ngx-resgridlib';
import { SettingsState } from 'src/app/features/settings/store/settings.store';
import * as CallsActions from '../../actions/calls.actions';

@Component({
  selector: 'app-modal-call-notes',
  templateUrl: './modal-notes.page.html',
  styleUrls: ['./modal-notes.page.scss'],
})
export class ModalCallNotesPage implements OnInit {
  public callsState$: Observable<CallsState | null>;
  public settingsState$: Observable<SettingsState | null>;
  public isSavingNote: boolean = false;
  public callNotesFormData: FormGroup;

  constructor(
    private store: Store<CallsState>,
    private settingsStore: Store<SettingsState>,
    public formBuilder: FormBuilder,
    private config: ResgridConfig
  ) {
    this.callsState$ = this.store.select(selectCallsState);
    this.settingsState$ = this.settingsStore.select(selectSettingsState);

    this.callNotesFormData = this.formBuilder.group({
      message: ['', [Validators.required]],
    });
  }

  ngOnInit() {
    
  }

  dismissModal() {
    this.store.dispatch(new CallsActions.CloseCallNotesModal());
  }

  public getAvatarUrl(userId) {
    return this.config.apiUrl + '/Avatars/Get?id=' + userId;
  }

  public saveNote() {
    this.settingsStore
      .select(selectSettingsState)
      .pipe(take(1))
      .subscribe((settingsState) => {
        if (settingsState && settingsState.user) {
          this.store
            .select(selectCallsState)
            .pipe(take(1))
            .subscribe((state) => {
              if (state && state.callToView) {
                const note = this.callNotesFormData.value['message'];

                this.store.dispatch(
                  new CallsActions.SaveCallNote(
                    state.callToView.CallId,
                    note,
                    settingsState.user.userId
                  )
                );

                this.callNotesFormData.controls['message'].setValue('');
                this.callNotesFormData.controls['message'].patchValue('');
              }
            });
        }
      });
  }
}
