import { Component, OnInit, Output } from '@angular/core';
import { environment } from '../../../../../environments/environment';
import {
	CalendarItemResultData,
	ShiftResultData,
	UtilsService,
} from '@resgrid/ngx-resgridlib';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { selectCalendarState, selectShiftsState } from 'src/app/store';
import * as ShiftsActions from '../../actions/shifts.actions';
import { take } from 'rxjs/operators';
import { ShiftsState } from '../../store/shifts.store';
import { CalendarEvent, CalendarView } from 'angular-calendar';
import { isSameDay, isSameMonth } from 'date-fns';
import * as _ from 'lodash';

@Component({
	selector: 'app-shifts-shift-detail',
	templateUrl: './shift-detail.page.html',
	styleUrls: ['./shift-detail.page.scss'],
})
export class ShiftDetailPage {
	public tabType: string = 'details';
	public shiftsState$: Observable<ShiftsState | null>;
	public note: string = '';
	public viewDate: Date = new Date();
	public refresh = new Subject<void>();
	public activeDayIsOpen: boolean = true;
	public view: CalendarView = CalendarView.Month;
	public events: CalendarEvent<{ item: any }>[] = [];

	constructor(
		private utilsProvider: UtilsService,
		private shiftsStore: Store<ShiftsState>
	) {
		this.shiftsState$ = this.shiftsStore.select(selectShiftsState);
	}

	ionViewDidEnter() {
		this.shiftsState$.pipe(take(1)).subscribe((state) => {
			if (state && state.viewShift && state.viewShift.Days) {
				this.events = new Array<CalendarEvent<{ item: any }>>();

				state.viewShift.Days.forEach((item) => {
					this.events.push({
						start: new Date(item.Start),
						end: new Date(item.End),
						title: state.viewShift.Name,
						color: {
							primary: state.viewShift.Color,
							secondary: state.viewShift.Color,
						},
						allDay: true,
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
	}

	public closeOpenMonthViewDay() {
		this.activeDayIsOpen = false;
	}

	public closeModal() {
		this.shiftsStore.dispatch(new ShiftsActions.DismissModal());
	}

	public segmentChanged(ev: any) {
		if (ev && ev.detail && ev.detail.value) {
		}
	}

	public getDate(date) {
		return this.utilsProvider.getDate(date);
	}

	public getTimeago(date) {
		return this.utilsProvider.getTimeAgo(date);
	}

	public getStartDate(item: ShiftResultData): string {
		if (!item || !item.Days) {
			return 'No Start';
		}

		return this.utilsProvider.getDate(item.Days[0].Start);
	}

	public getEndDate(item: ShiftResultData): string {
		if (!item || !item.Days) {
			return 'No End';
		}

		return this.utilsProvider.getDate(item.Days[0].End);
	}

	public getDarkMode(): string {
		if (document.body.classList.contains('dark')) return 'dark-theme';
		else return '';
	}

	public getScheduleType(item: ShiftResultData): string {
		return 'Manual';
	}

	public getAssignmentType(item: ShiftResultData): string {
		return 'Assigned';
	}

	public now() {
		return this.utilsProvider.getDate(new Date().toDateString());
	}

	public isRsvp(item: CalendarItemResultData) {
		return item.SignupType == 2;
	}

	public getAvatarUrl(userId: string) {
		return (
			environment.baseApiUrl +
			environment.resgridApiUrl +
			'/Avatars/Get?id=' +
			userId
		);
	}

	public handleEvent(action: string, event: CalendarEvent): void {
		if (action === 'Clicked') {
			if (event && event.meta && event.meta.item) {
				this.shiftsState$.pipe(take(1)).subscribe((state) => {
					if (state && state.viewShift && state.viewShift.Days) {
						const shiftDay = _.find(state.viewShift.Days, [
							'ShiftDayId',
							event.meta.item.ShiftDayId,
						]);

						if (shiftDay) {
							this.shiftsStore.dispatch(
								new ShiftsActions.ViewShiftDay(shiftDay)
							);
						}
					}
				});
			}
		}
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
}
