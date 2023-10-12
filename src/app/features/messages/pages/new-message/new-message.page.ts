import { Component } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { selectMessagesState, selectRecipientsState, selectSettingsState } from 'src/app/store';
import { MessagesState } from '../../store/messages.store';
import { CalendarEvent, CalendarView } from 'angular-calendar';
import { MessageRecipientInput, MessageResultData, RecipientsResultData, UtilsService } from '@resgrid/ngx-resgridlib';
import { SubSink } from 'subsink';
import * as _ from 'lodash';
import { environment } from 'src/environments/environment';
import * as MessagesActions from '../../actions/messages.actions';
import { SettingsState } from 'src/app/features/settings/store/settings.store';
import { take } from 'rxjs/operators';
import { ModalController } from '@ionic/angular';
import { SelectRecipientsPage } from '../select-recipients/select-recipients.page';
import { AlertProvider } from 'src/app/providers/alert';

@Component({
	selector: 'app-new-message',
	templateUrl: './new-message.page.html',
	styleUrls: ['./new-message.page.scss'],
})
export class NewMessagePage {
	public messagesState$: Observable<MessagesState | null>;
	public settingsState$: Observable<SettingsState | null>;
	public recipients$: Observable<RecipientsResultData[] | null>;
	private subs = new SubSink();
	public note: string;
	public userId: string;
	public recipientList: string;
	public type: string = "0";
	public subject: string = '';
	public body: string = '';

	constructor(
		private messagesStore: Store<MessagesState>,
		private settingsStore: Store<SettingsState>,
		private utilsProvider: UtilsService,
		private alertProvider: AlertProvider
	) {
		this.messagesState$ = this.messagesStore.select(selectMessagesState);
		this.settingsState$ = this.messagesStore.select(selectSettingsState);
		this.recipients$ = this.messagesStore.select(selectRecipientsState);
	}

	ionViewDidEnter() {
		this.recipientList = 'Select Recipients...';
		this.type = "0";
		this.subject = '';
		this.body = '';

		this.settingsState$.pipe(take(1)).subscribe((settingsState) => {
			if (settingsState && settingsState.user) {
				this.userId = settingsState.user.userId;
			}
		});

		this.subs.sink = this.recipients$.subscribe((recipients) => {
			if (recipients && recipients.length > 0) {
				this.recipientList = '';

				recipients.forEach(recipient => {
					if (recipient.Selected) {
						if (this.recipientList.length > 0) {
							this.recipientList += ', ' + recipient.Name;
						} else { 
							this.recipientList += recipient.Name;
						}
					}
				});

				if (this.recipientList.length === 0) {
					this.recipientList = 'Select Recipients...';
				}
			} else {
				this.recipientList = 'Select Recipients...';
			}
		});
	}

	ionViewDidLeave() {
		if (this.subs) {
			this.subs.unsubscribe();
		}
	}

	public closeModal() {
		this.messagesStore.dispatch(new MessagesActions.CloseNewMessageModal());
	}

	public selectRecipients() {
		this.messagesState$.pipe(take(1)).subscribe((messageState) => {
			if (messageState && messageState.recipients && messageState.recipients.length > 0) {
				this.messagesStore.dispatch(
					new MessagesActions.ShowSelectRecipientsSuccess(null)
				);
			} else {
				this.messagesStore.dispatch(
					new MessagesActions.ShowSelectRecipients()
				);
			}
		});
	}

	public send() {
		if (this.recipientList === '' || this.recipientList === 'Select Recipients...') {
			this.alertProvider.showOkAlert(
				'Send Message Error',
				'',
				'You must select at least one recipient.'
			  )
			return;
		}

		if (this.subject === '') {
			this.alertProvider.showOkAlert(
				'Send Message Error',
				'',
				'You must enter a subject.'
			  )
			return;
		}

		if (this.body === '') {
			this.alertProvider.showOkAlert(
				'Send Message Error',
				'',
				'You must supply a body for the message.'
			  )
			return;
		}

		this.messagesState$.pipe(take(1)).subscribe((messagesState) => {
			if (messagesState && messagesState.recipients && messagesState.recipients.length > 0) {
				let recipients: MessageRecipientInput[] = [];

				messagesState.recipients.forEach(recipient => {

					let recipientType = 0;

					if (recipient.Type === 'Personnel') {
						recipientType = 1;
					} if (recipient.Type === 'Groups') {
						recipientType = 2;
					} if (recipient.Type === 'Roles') {
						recipientType = 3;
					}

					if (recipient.Selected) {
						recipients.push({
							Id: recipient.Id,
							Type: recipientType,
							Name: recipient.Name
						});
					}
				});

				this.messagesStore.dispatch(
					new MessagesActions.SendMessage(this.subject, this.body, parseInt(this.type), recipients)
				);
			}
		});
	}
}
