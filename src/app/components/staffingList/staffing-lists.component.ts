import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import {
	DepartmentVoiceChannelResultData,
	StatusesResultData,
} from '@resgrid/ngx-resgridlib';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { HomeState } from 'src/app/features/home/store/home.store';
import {
	selectAvailableChannelsState,
	selectHomeState,
	selectSettingsState,
	selectVoiceState,
} from 'src/app/store';
import { StatusesState } from '../../features/statuses/store/statuses.store';
import * as StatusesActions from '../../features/statuses/actions/statuses.actions';
import { SettingsState } from 'src/app/features/settings/store/settings.store';

@Component({
	selector: 'app-staffing-lists',
	templateUrl: './staffing-lists.component.html',
	styleUrls: ['./staffing-lists.component.scss'],
})
export class StaffingListComponent implements OnInit {
	public homeState$: Observable<HomeState | null>;
	public settingsState$: Observable<SettingsState | null>;

	constructor(
		private store: Store<HomeState>,
		private statusesStore: Store<StatusesState>,
		private settingsStore: Store<SettingsState>
	) {
		this.homeState$ = this.store.select(selectHomeState);
		this.settingsState$ = this.settingsStore.select(selectSettingsState);
	}

	ngOnInit(): void {}

	public filterStatuses(statuses: StatusesResultData[]) {
		if (statuses) {
			return statuses.filter(
				(s) =>
					s.Text === 'Standing By' ||
					s.Text === 'Not Responding' ||
					s.Text === 'Responding' ||
					s.Text === 'On Scene'
			);
		}
	}

	public submitStatus(status: StatusesResultData) {
		this.settingsStore
			.select(selectSettingsState)
			.pipe(take(1))
			.subscribe((settingsState) => {
				this.statusesStore.dispatch(
					new StatusesActions.SubmitPersonStaffing(
						settingsState.user.userId,
						status
					)
				);
			});
	}
}
