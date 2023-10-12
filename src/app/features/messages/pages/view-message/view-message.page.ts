import { Component } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import {
	selectMessagesState, selectSettingsState,
} from 'src/app/store';
import { MessagesState } from '../../store/messages.store';
import {
	CalendarEvent,
	CalendarView,
} from 'angular-calendar';
import { MessageResultData, UtilsService } from '@resgrid/ngx-resgridlib';
import { SubSink } from 'subsink';
import * as _ from 'lodash';
import { environment } from 'src/environments/environment';
import * as MessagesActions from '../../actions/messages.actions';
import { SettingsState } from 'src/app/features/settings/store/settings.store';
import { take } from 'rxjs/operators';

@Component({
	selector: 'app-view-message',
	templateUrl: './view-message.page.html',
	styleUrls: ['./view-message.page.scss'],
})
export class ViewMessagePage {
	public tabType: string = 'received';
	public viewDate: Date = new Date();
	public refresh = new Subject<void>();
	public activeDayIsOpen: boolean = true;
	public view: CalendarView = CalendarView.Month;
	public messagesState$: Observable<MessagesState | null>;
	public settingsState$: Observable<SettingsState | null>;
	private subs = new SubSink();
	public events: CalendarEvent<{ item: any }>[] = [];
	public note: string;
	public userId: string;

	constructor(
		private messagesStore: Store<MessagesState>,
		private settingsStore: Store<SettingsState>,
		private utilsProvider: UtilsService
	) {
		this.messagesState$ = this.messagesStore.select(selectMessagesState);
		this.settingsState$ = this.messagesStore.select(selectSettingsState);
	}

	ionViewDidEnter() {
		this.settingsState$.pipe(take(1)).subscribe((settingsState) => {
			if (settingsState && settingsState.user) {
				this.userId = settingsState.user.userId;
			}
		});
	}

	ionViewDidLeave() {
		if (this.subs) {
			this.subs.unsubscribe();
		}
	}

	public isInTheFuture(message: MessageResultData) {
		if (message && message.ExpiredOn && new Date(message.ExpiredOn) >= new Date()) {
			return true;
		}

		return false;
	}

	public canSignup(message: MessageResultData) {
		if (message && (message.Type === 1 || message.Type === 2)) {
			let userRespond = _.find(message.Recipients, [
				'UserId',
				this.userId
			  ]);

			if (userRespond && userRespond.RespondedOn) {
				return false;
			}

			return true;
		}

		return false;
	}

	public closeModal() {
		this.messagesStore.dispatch(new MessagesActions.DismissModal());
	}

	public setResponding(type: number) {
		this.messagesState$.pipe(take(1)).subscribe((messageState) => {
			if (messageState && messageState.viewMessage) {
				this.messagesStore.dispatch(new MessagesActions.RespondToMessage(messageState.viewMessage.MessageId, this.userId, type, this.note));
			}
		});
	}

	public delete() {
		this.messagesState$.pipe(take(1)).subscribe((messageState) => {
			if (messageState && messageState.viewMessage) {
				this.messagesStore.dispatch(new MessagesActions.DeleteMessage(messageState.viewMessage.MessageId));
			}
		});
	}

	public getAvatarUrl(userId: string) {
		return (
			environment.baseApiUrl +
			environment.resgridApiUrl +
			'/Avatars/Get?id=' +
			userId
		);
	}

	public formatDate(date: string) {
		if (date)
			return this.utilsProvider.formatDateForDisplay(new Date(date), 'yyyy-MM-dd HH:mm Z');
		
		return '';
	}

	public newMessage() {
		this.messagesStore.dispatch(new MessagesActions.NewMessage());
	}
}
