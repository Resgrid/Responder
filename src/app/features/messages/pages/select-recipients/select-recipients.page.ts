import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import {
	selectHomeState,
	selectMessagesState,
	selectRecipientsState,
	selectSettingsState,
} from 'src/app/store';
import { MessagesState } from '../../store/messages.store';
import { CalendarEvent, CalendarView } from 'angular-calendar';
import { MessageResultData, RecipientsResultData, UtilsService } from '@resgrid/ngx-resgridlib';
import { SubSink } from 'subsink';
import * as _ from 'lodash';
import { environment } from 'src/environments/environment';
import * as MessagesActions from '../../actions/messages.actions';
import { SettingsState } from 'src/app/features/settings/store/settings.store';
import { take } from 'rxjs/operators';
import { HomeState } from 'src/app/features/home/store/home.store';
import { IonContent, ModalController } from '@ionic/angular';

@Component({
	selector: 'app-select-recipients',
	templateUrl: './select-recipients.page.html',
	styleUrls: ['./select-recipients.page.scss'],
})
export class SelectRecipientsPage {
	private position: number = 0;
	private subs = new SubSink();
	public messagesState$: Observable<MessagesState | null>;
	public recipientsToMessage$: Observable<RecipientsResultData[] | null>;
	public recipients: RecipientsResultData[] = [];
	@ViewChild(IonContent) content: IonContent;
	
	constructor(
		private messagesStore: Store<MessagesState>,
		private utilsProvider: UtilsService
	) {
		this.messagesState$ = this.messagesStore.select(selectMessagesState);
		this.recipientsToMessage$ = this.messagesStore.select(selectRecipientsState);
	}

	ionViewDidEnter() {
		this.subs.sink = this.recipientsToMessage$.subscribe((sendTo) => {
			if (sendTo) {
				this.recipients = sendTo;
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
		this.messagesStore.dispatch(
			new MessagesActions.CloseSelectRecipientsModal()
		);
	}

	confirm() {
		this.messagesStore.dispatch(
			new MessagesActions.CloseSelectRecipientsModal()
		);
	}

	public selectOption(event, id: string) {
		var checked = event.target.checked;

		this.messagesStore.dispatch(
			new MessagesActions.UpdateSelectedRecipient(id, checked)
		);
	}

	public onScroll(event) {
		if (event && event.detail && event.detail.scrollTop > 0) {
			this.position = event.detail.scrollTop;
		}
	}
}
