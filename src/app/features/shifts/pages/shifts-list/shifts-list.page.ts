import { Component, OnInit, Output, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject, Subscription } from 'rxjs';
import {
	selectCalendarItemsState,
	selectCalendarState,
	selectProtocolsState,
	selectShiftsState,
} from 'src/app/store';
import { ShiftsState } from '../../store/shifts.store';
import * as ShiftsActions from '../../actions/shifts.actions';
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
import { CalendarItemResultData, ShiftDaysResultData, ShiftResultData, UtilsService } from '@resgrid/ngx-resgridlib';
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
	selector: 'app-shifts-list',
	templateUrl: './shifts-list.page.html',
	styleUrls: ['./shifts-list.page.scss'],
})
export class ShiftsListPage {
	public tabType: string = 'today';
	public viewDate: Date = new Date();
	public refresh = new Subject<void>();
	public activeDayIsOpen: boolean = true;
	public view: CalendarView = CalendarView.Month;
	public shiftsState$: Observable<ShiftsState | null>;
	private subs = new SubSink();
	public events: CalendarEvent<{ item: any }>[] = [];

	constructor(
		private shiftsStore: Store<ShiftsState>,
		private utilsProvider: UtilsService
	) {
		this.shiftsState$ = this.shiftsStore.select(selectShiftsState);
	}

	ionViewDidEnter() {
		this.shiftsStore.dispatch(new ShiftsActions.LoadTodaysShifts());
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
				this.shiftsStore.dispatch(
					new ShiftsActions.LoadTodaysShifts()
				);
			} else if (ev.detail.value === 'shifts') {
				this.shiftsStore.dispatch(
					new ShiftsActions.LoadShifts()
				);
			}
		}
	}

	public hexToRgb(hex) {
		if (!hex) {
		  return {
			r: 0,
			g: 0,
			b: 0
		  };
		}
	
		// Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
		var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
		hex = hex.replace(shorthandRegex, function (m, r, g, b) {
		  return r + r + g + g + b + b;
		});
	
		var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result ? {
		  r: parseInt(result[1], 16),
		  g: parseInt(result[2], 16),
		  b: parseInt(result[3], 16)
		} : null;
	  }

	public getBackgroundColorForShiftHeader(shift: ShiftResultData): string {
		let color = this.hexToRgb(shift.Color);
	
		return "rgba(" + color.r + ", " + color.g + ", " + color.b + ", 0.5)";
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
		return this.utilsProvider.formatDateForDisplay(
			new Date(dateToParse),
			'MMMM'
		);
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

	public viewDetail(event: ShiftDaysResultData) {
		this.shiftsStore.dispatch(
			new ShiftsActions.ViewShiftDay(event)
		  );
	}

	public viewShiftDetail(event: ShiftResultData) {
		this.shiftsStore.dispatch(
			new ShiftsActions.ViewShift(event)
		  );
	}

	public getSideColor(event: ShiftResultData) {
		if (event.Color) {
			return `5px solid ${event.Color}`;
		} else {
			return `5px solid #000`;
		}
	}
}
