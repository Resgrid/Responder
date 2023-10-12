import { Component, OnInit, Output } from '@angular/core';
import { environment } from '../../../../../environments/environment';
import { CalendarItemResultData, GroupResultData, RoleResultData, ShiftDaysResultData, ShiftResultData, UtilsService } from '@resgrid/ngx-resgridlib';
import { Store } from '@ngrx/store';
import { Observable, Subject, Subscription } from 'rxjs';
import { selectCalendarState, selectHomeState, selectShiftsState } from 'src/app/store';
import * as ShiftsActions from '../../actions/shifts.actions';
import { map, take } from 'rxjs/operators';
import { ShiftsState } from '../../store/shifts.store';
import { CalendarEvent, CalendarView } from 'angular-calendar';
import { isSameDay, isSameMonth } from 'date-fns';
import { HomeState } from 'src/app/features/home/store/home.store';

@Component({
	selector: 'app-shifts-shift-day',
	templateUrl: './shift-day.page.html',
	styleUrls: ['./shift-day.page.scss'],
})
export class ShiftDayPage {
	public shiftsState$: Observable<ShiftsState | null>;
	public homeState$: Observable<HomeState | null>;

	constructor(
		private utilsProvider: UtilsService,
		private shiftsStore: Store<ShiftsState>,
		private homeStore: Store<HomeState>
	) {
		this.shiftsState$ = this.shiftsStore.select(selectShiftsState);
		this.homeState$ = this.homeStore.select(selectHomeState);
	}

	ionViewDidEnter() {

	}

	public getStartDate(item: ShiftDaysResultData): string {
		if (!item) {
			return 'No Start';
		}

		return this.utilsProvider.getDate(item.Start);
	}

	public getEndDate(item: ShiftDaysResultData): string {
		if (!item) {
			return 'No End';
		}

		return this.utilsProvider.getDate(item.End);
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

	public getGroup(groupId): Observable<GroupResultData> {
		return this.homeState$.pipe(map((state) => {
			if (state && state.groups) {
				return state.groups.find((g) => g.GroupId === groupId);
			}
		}));
	}

	public getRole(groupId): RoleResultData {
		return null;
	}

	public closeModal() {
		this.shiftsStore.dispatch(new ShiftsActions.DismissModal());
	}

	public isInTheFuture(shiftDay: ShiftDaysResultData) {
		if (shiftDay && shiftDay.ShiftDay && new Date(shiftDay.ShiftDay) >= new Date()) {
			return true;
		}

		return false;
	}

	public signup(groupId) {

	}
}
