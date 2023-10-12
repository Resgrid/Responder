import { Component, ContentChild, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { selectCallsState, selectNewCallDispatchesState } from 'src/app/store';
import { RecipientsResultData, UtilsService } from '@resgrid/ngx-resgridlib';
import { SubSink } from 'subsink';
import * as _ from 'lodash';
import * as CallsActions from '../../actions/calls.actions';
import { CallsState } from '../../store/calls.store';
import { ScrollDirective } from 'src/app/directives/scroll.directive';
import { IonContent } from '@ionic/angular';
import { take } from 'rxjs/operators';

@Component({
	selector: 'app-calls-close-call',
	templateUrl: './close-call.page.html',
	styleUrls: ['./close-call.page.scss'],
})
export class CloseCallPage {
	public note: string;
	public type: string = "1";
	private subs = new SubSink();
	public callsState$: Observable<CallsState | null>;

	constructor(
		private callsStore: Store<CallsState>
	) {
		this.callsState$ = this.callsStore.select(selectCallsState);
	}

	ionViewDidEnter() {
		
	}

	ionViewDidLeave() {
		if (this.subs) {
			this.subs.unsubscribe();
		}
	}

	public closeModal() {
		this.callsStore.dispatch(new CallsActions.CloseCloseCallModal());
	}

	public closeCall() {
		this.callsState$.pipe(take(1)).subscribe(state => {
			if (state && state.callToView) {
				this.callsStore.dispatch(new CallsActions.CloseCall(state.callToView.CallId, parseInt(this.type), this.note));
			}
		});
	}

	public isValid() {
		if (!this.note || this.note.length <= 0) {
			return false;
		}

		return true;
	}
}
