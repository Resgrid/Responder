import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, NavController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import * as SettingsActions from '../../../settings/actions/settings.actions';
import { HomeState } from 'src/app/features/home/store/home.store';
import { Observable } from 'rxjs';
import { selectCallsState, selectHomeState, selectPushData } from 'src/app/store';
import { CallResultData, UnitResultData } from '@resgrid/ngx-resgridlib';
import { take } from 'rxjs/operators';
import * as _ from 'lodash';
import { PushData } from 'src/app/models/pushData';
import { CallsState } from 'src/app/features/calls/store/calls.store';
import * as CallsActions from "../../../../features/calls/actions/calls.actions";
import { Router } from '@angular/router';

@Component({
  selector: 'app-modal-callPush',
  templateUrl: './modal-callPush.page.html',
  styleUrls: ['./modal-callPush.page.scss'],
})
export class ModalCallPush implements OnInit {
  public homeState$: Observable<HomeState | null>;
  public pushData$: Observable<PushData | null>;
  public callsState$: Observable<CallsState | null>;

  constructor(private modal: ModalController, private store: Store<HomeState>, 
    private callsStore: Store<CallsState>, private router: Router) {
    this.homeState$ = this.store.select(selectHomeState);
    this.pushData$ = this.store.select(selectPushData);
    this.callsState$ = this.callsStore.select(selectCallsState);
  }

  ngOnInit() {
    
  }

  public dismissModal() {
    this.router.navigate(['/home/tabs/status']);
    this.modal.dismiss();
  }

  public set() {
    this.store
      .select(selectHomeState)
      .pipe(take(1))
      .subscribe((state) => {
        if (state && state.pushData) {
          const call = _.find(state.calls, ['CallId', state.pushData.entityId]);

          if (call) {
            this.callsStore.dispatch(
              new CallsActions.GetCallById(call.CallId)
            );
          } else {
            this.modal.dismiss();
          }
        } else {
          this.modal.dismiss();
        }
      });
  }

}
