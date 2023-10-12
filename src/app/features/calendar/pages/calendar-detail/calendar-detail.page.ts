import { Component, OnInit, Output } from '@angular/core';
import { environment } from '../../../../../environments/environment';
import { CalendarItemResultData, UtilsService } from '@resgrid/ngx-resgridlib';
import { Store } from '@ngrx/store';
import { CalendarState } from '../../store/calendar.store';
import { Observable } from 'rxjs';
import { selectCalendarState } from 'src/app/store';
import * as CalendarActions from '../../actions/calendar.actions';
import { take } from 'rxjs/operators';

@Component({
	selector: 'app-calendar-calendar-detail',
	templateUrl: './calendar-detail.page.html',
	styleUrls: ['./calendar-detail.page.scss'],
})
export class CalendarDetailPage {
	public tabType: string = 'details';
	public calendarState$: Observable<CalendarState | null>;
	public note: string = '';

	constructor(
		private utilsProvider: UtilsService,
		private calendarStore: Store<CalendarState>
	) {
		this.calendarState$ = this.calendarStore.select(selectCalendarState);
	}

	ionViewDidEnter() {
		
	}

	public closeModal() {
		this.calendarStore.dispatch(new CalendarActions.DismissModal());
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

	public getStartDate(item: CalendarItemResultData): string {
		if (!item || !item.Start) {
			return 'No Start';
		}

		return this.utilsProvider.formatDateForDisplay(
			new Date(item.Start),
			'MM-dd-yyyy HH:mm'
		  );//getDate(item.Start);
	}

	public getEndDate(item: CalendarItemResultData): string {
		if (!item || !item.End) {
			return 'No End';
		}

		return this.utilsProvider.formatDateForDisplay(
			new Date(item.End),
			'MM-dd-yyyy HH:mm'
		  );//.getDate(item.End);
	}

	public getTimeTillStart(item: CalendarItemResultData): string {
		if (!item || !item.End) {
			return 'Unknown';
		}

		return this.utilsProvider.getTimeAgo(item.Start);
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

	public setResponding(type: number) {
    this.calendarState$.pipe(take(1)).subscribe((state) => {
      if (state && state.viewCalendarItem) {
        this.calendarStore.dispatch(
          new CalendarActions.SetCalendarItemAttendingStatus(
            state.viewCalendarItem.CalendarItemId,
            this.note,
            type
          )
        );
      }
    });
	}
}
