import { Component, ContentChild, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { selectCallsState, selectEditCallDispatchesState, selectNewCallDispatchesState } from 'src/app/store';
import { RecipientsResultData, UtilsService } from '@resgrid/ngx-resgridlib';
import { SubSink } from 'subsink';
import * as _ from 'lodash';
import * as CallsActions from '../../actions/calls.actions';
import { CallsState } from '../../store/calls.store';
import { ScrollDirective } from 'src/app/directives/scroll.directive';
import { IonContent } from '@ionic/angular';

@Component({
	selector: 'app-select-dispatches-edit',
	templateUrl: './select-dispatches-edit.page.html',
	styleUrls: ['./select-dispatches-edit.page.scss'],
})
export class SelectDispatchesEditPage {
	private lastChecked: string = '';
	private position: number = 0;
	private subs = new SubSink();
	public callsState$: Observable<CallsState | null>;
	public whoToDispatch$: Observable<RecipientsResultData[] | null>;
	public newCallWhoDispatch: RecipientsResultData[] = [];
	//@ContentChild(ScrollDirective) scrollDirective;
	@ViewChild(IonContent) content: IonContent;

	constructor(
		private callsStore: Store<CallsState>,
		private utilsProvider: UtilsService,
		private scrollDirective: ScrollDirective
	) {
		this.callsState$ = this.callsStore.select(selectCallsState);
		this.whoToDispatch$ = this.callsStore.select(selectEditCallDispatchesState);
	}

	ionViewDidEnter() {
		this.subs.sink = this.whoToDispatch$.subscribe((dispatches) => {
			if (dispatches) {
				this.newCallWhoDispatch = dispatches;
				if (this.position > 0) {
					setTimeout(() =>
						this.content.scrollToPoint(0, this.position).then(() => {})
					);
				}
			}
		});
	}

	ionViewDidLeave() {
		if (this.subs) {
			this.subs.unsubscribe();
		}
	}

	public closeModal() {
		this.callsStore.dispatch(new CallsActions.CloseSelectDispatchesModal());
	}

	confirm() {
		this.callsStore.dispatch(new CallsActions.CloseSelectDispatchesModal());
	}

	public selectOption(event, id: string) {
		var checked = event.target.checked;
		this.lastChecked = id;

		this.callsStore.dispatch(
			new CallsActions.UpdatedEditCallSelectedDispatches(id, checked)
		);
	}

	private scrollToLastChecked() {
		// This works, but puts the item at the top instead of where the user was on the scroll list, not ideal.
		if (this.lastChecked) {
			var element = document.getElementById(this.lastChecked);
			if (element) {
				this.content.scrollToPoint(0, element.offsetTop - 60).then(() => {})
			}
		}
	}

	public onScroll(event) {
		if (event && event.detail && event.detail.scrollTop > 0) {
			this.position = event.detail.scrollTop;
		}
	}
}
