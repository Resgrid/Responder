import { Component, OnInit, Output, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject, Subscription } from 'rxjs';
import {
	selectCalendarItemsState,
	selectCalendarState,
	selectGetUpdateCalendarItemsState,
} from 'src/app/store';
import { CalendarState } from '../../store/calendar.store';
import * as CalendarActions from '../../actions/calendar.actions';
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
import { CalendarItemResultData, UtilsService } from '@resgrid/ngx-resgridlib';
import { SubSink } from 'subsink';
import * as _ from 'lodash';
import { take } from 'rxjs/operators';

const colors: any = {
	red: {
		primary: '#ad2121',
		secondary: '#FAE3E3',
	},
	blue: {
		primary: '#1e90ff',
		secondary: '#D1E8FF',
	},
	yellow: {
		primary: '#e3bc08',
		secondary: '#FDF1BA',
	},
};

@Component({
	selector: 'app-calendar-view',
	templateUrl: './calendar-view.page.html',
	styleUrls: ['./calendar-view.page.scss'],
})
export class CalendarViewPage {
	public tabType: string = 'today';
	public viewDate: Date = new Date();
	public refresh = new Subject<void>();
	public activeDayIsOpen: boolean = true;
	public view: CalendarView = CalendarView.Month;
	public calendarState$: Observable<CalendarState | null>;
	public calendarItems$: Observable<CalendarItemResultData[] | null>;
	public selectGetUpdateCalendarItemsState$: Observable<boolean>;
	private subs = new SubSink();
	public events: CalendarEvent<{ item: any }>[] = [];

	constructor(
		private calendarStore: Store<CalendarState>,
		private utilsProvider: UtilsService
	) {
		this.calendarState$ = this.calendarStore.select(selectCalendarState);
		this.calendarItems$ = this.calendarStore.select(selectCalendarItemsState);
		this.selectGetUpdateCalendarItemsState$ = this.calendarStore.select(selectGetUpdateCalendarItemsState);
	}

	ionViewDidEnter() {
		this.subs.sink = this.calendarItems$.subscribe((items) => {
			if (items) {
				this.events = new Array<CalendarEvent<{ item: any }>>();

				items.forEach((item) => {
					this.events.push({
						start: new Date(item.Start),
						end: new Date(item.End),
						title: item.Title,
						color: colors.red,
						allDay: item.IsAllDay,
						resizable: {
							beforeStart: false,
							afterEnd: false,
						},
						meta: {
							item,
						  },
						draggable: false,
					});
				});
			}
		});

		this.subs.sink = this.selectGetUpdateCalendarItemsState$.subscribe((state) => {
			if (state) {
				if (this.tabType == 'today') {
					this.calendarStore.dispatch(new CalendarActions.LoadTodaysCalendarItems());
				} else if (this.tabType == 'upcomming') {
					this.calendarStore.dispatch(new CalendarActions.LoadUpcomingCalendarItems());
				} else if (this.tabType == 'calendar') {
					this.calendarStore.dispatch(new CalendarActions.LoadCalendarItems());
				}
			}
		});

		this.calendarStore.dispatch(new CalendarActions.LoadTodaysCalendarItems());
	}

	ionViewDidLeave() {
		if (this.subs) {
			this.subs.unsubscribe();
		}
	}

	public getDarkMode(): string {
		if (document.body.classList.contains('dark')) return 'dark-theme';
		else return '';
	}

	public closeOpenMonthViewDay() {
		this.activeDayIsOpen = false;
	}

	public segmentChanged(ev: any) {
		if (ev && ev.detail && ev.detail.value) {
			if (ev.detail.value === 'today') {
				this.calendarStore.dispatch(
					new CalendarActions.LoadTodaysCalendarItems()
				);
			} else if (ev.detail.value === 'upcomming') {
				this.calendarStore.dispatch(
					new CalendarActions.LoadUpcomingCalendarItems()
				);
			} else if (ev.detail.value === 'calendar') {
				this.calendarStore.dispatch(new CalendarActions.LoadCalendarItems());
			}
		}
	}

	public addDaysToDate(date: Date, days: number): Date {
		return addDays(date, days);
	}

	public dayClicked({
		date,
		events,
	}: {
		date: Date;
		events: CalendarEvent[];
	}): void {
		if (isSameMonth(date, this.viewDate)) {
			if (
				(isSameDay(this.viewDate, date) && this.activeDayIsOpen === true) ||
				events.length === 0
			) {
				this.activeDayIsOpen = false;
			} else {
				this.activeDayIsOpen = true;
			}
			this.viewDate = date;
		}
	}

	public getDateDay(dateToParse) {
		return this.utilsProvider.formatDateForDisplay(new Date(dateToParse), 'dd');
	}

	public getDateMonth(dateToParse) {
		const month = this.utilsProvider.formatDateForDisplay(
			new Date(dateToParse),
			'MMMM'
		);

		return month;
	}

	public getDateTime(dateToParse) {
		return this.utilsProvider.formatDateForDisplay(
			new Date(dateToParse),
			'HH:mm'
		);
	}

	public getFullDateTime(dateToParse) {
		return this.utilsProvider.formatDateForDisplay(
			new Date(dateToParse),
			'yyyy-MM-dd HH:mm Z'
		);
	}

	public handleEvent(action: string, event: CalendarEvent): void {
		if (action === 'Clicked') {
			if (event && event.meta && event.meta.item) {
				this.calendarState$.pipe(take(1)).subscribe((state) => {
					if (state && state.calendarItems) {
						const calendarItem = _.find(state.calendarItems, ['CalendarItemId', event.meta.item.CalendarItemId]);

						if (calendarItem) {
							this.calendarStore.dispatch(
								new CalendarActions.ViewCalendarItem(calendarItem)
							  );
						}
					}
				});
			}
		}
	}

	public viewDetail(event: CalendarItemResultData) {
		this.calendarStore.dispatch(
			new CalendarActions.ViewCalendarItem(event)
		  );
	}

	public getSideColor(event: CalendarItemResultData) {
		if (event.TypeColor) {
			return `5px solid ${event.TypeColor}`;
		} else {
			return `5px solid #000`;
		}
	}
}
