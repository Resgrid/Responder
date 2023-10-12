import { Component, OnInit, Output, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject, Subscription } from 'rxjs';
import {
	selectCalendarItemsState,
	selectCalendarState,
	selectMessagesState,
	selectProtocolsState,
	selectShiftsState,
} from 'src/app/store';
import { MessagesState } from '../../store/messages.store';
import * as MessagesActions from '../../actions/messages.actions';
import {
	startOfDay,
	endOfDay,
	subDays,
	addDays,
	endOfMonth,
	isSameDay,
	isSameMonth,
	addHours,
} from 'date-fns';
import {
	CalendarEvent,
	CalendarEventAction,
	CalendarView,
} from 'angular-calendar';
import {
	CalendarItemResultData,
	MessageResultData,
	SecurityService,
	ShiftDaysResultData,
	ShiftResultData,
	UtilsService,
} from '@resgrid/ngx-resgridlib';
import { SubSink } from 'subsink';
import * as _ from 'lodash';
import { take } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Component({
	selector: 'app-messages-list',
	templateUrl: './messages-list.page.html',
	styleUrls: ['./messages-list.page.scss'],
})
export class MessagesListPage {
	public tabType: string = 'received';
	public viewDate: Date = new Date();
	public refresh = new Subject<void>();
	public activeDayIsOpen: boolean = true;
	public view: CalendarView = CalendarView.Month;
	public messagesState$: Observable<MessagesState | null>;
	private subs = new SubSink();
	public events: CalendarEvent<{ item: any }>[] = [];

	constructor(
		private messagesStore: Store<MessagesState>,
		private utilsProvider: UtilsService,
		private securityService: SecurityService
	) {
		this.messagesState$ = this.messagesStore.select(selectMessagesState);
	}

	ionViewDidEnter() {
		this.loadInbox();
	}

	ionViewDidLeave() {
		this.messagesStore.dispatch(new MessagesActions.ClearMessages());
		
		if (this.subs) {
			this.subs.unsubscribe();
		}
	}

	public viewMessage(message: MessageResultData) {
		this.messagesStore.dispatch(new MessagesActions.ViewMessage(message));
	}

	public getAvatarUrl(userId: string) {
		return (
			environment.baseApiUrl +
			environment.resgridApiUrl +
			'/Avatars/Get?id=' +
			userId
		);
	}

	public segmentChanged(ev: any) {
		if (ev && ev.detail && ev.detail.value) {
			if (ev.detail.value === 'received') {
				this.loadInbox();
			} else if (ev.detail.value === 'sent') {
				this.loadOutbox();
			}
		}
	}

	public canCreateMessage() {
		return this.securityService.canUserCreateMessages();
	  }

	public newMessage() {
		this.messagesStore.dispatch(new MessagesActions.NewMessage());
	}

	public refreshInbox(event) {
		this.loadInbox();

		setTimeout(() => {
			event.target.complete();
		}, 1000);
	}

	public refreshOutbox(event) {
		this.loadOutbox();

		setTimeout(() => {
			event.target.complete();
		}, 1000);
	}

	private loadInbox() {
		this.messagesStore.dispatch(new MessagesActions.LoadInboxMessages());
	}

	private loadOutbox() {
		this.messagesStore.dispatch(new MessagesActions.LoadOutboxMessages());
	}
}
