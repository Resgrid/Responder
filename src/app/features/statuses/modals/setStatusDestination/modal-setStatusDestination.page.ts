import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { HomeState } from 'src/app/features/home/store/home.store';
import { Observable } from 'rxjs';
import { selectHomeState, selectStatusesState } from 'src/app/store';
import {
	CallResultData,
	StatusesResultData,
	UnitResultData,
} from '@resgrid/ngx-resgridlib';
import { take } from 'rxjs/operators';
import * as _ from 'lodash';
import { StatusesState } from '../../store/statuses.store';
import { StatusDestination } from '../../models/statusDestination';
import * as StatusesActions from '../../actions/statuses.actions';
import * as SettingsActions from '../../../settings/actions/settings.actions';

@Component({
	selector: 'app-modal-setStatusDestination',
	templateUrl: './modal-setStatusDestination.page.html',
	styleUrls: ['./modal-setStatusDestination.page.scss'],
})
export class ModalSetStatusDestinationPage implements OnInit {
	public selectedDestination: StatusDestination;
	public statusesState$: Observable<StatusesState | null>;
	public selectOptions: any;
	public status: StatusesResultData;

	@Input() activeCallId: string;

	constructor(
		private modal: ModalController,
		private statusesStore: Store<StatusesState>,
		private homeStore: Store<HomeState>
	) {
		this.statusesState$ = this.statusesStore.select(selectStatusesState);
	}

	ngOnInit() {
		this.selectOptions = {
			title: 'Select Destination',
			subTitle: 'The destination of your action',
			mode: 'lg',
		};
		
		this.statusesStore
			.select(selectStatusesState)
			.pipe(take(1))
			.subscribe((statusesState) => {
				if (statusesState) {
					if (statusesState.submitStatusDestinations) {
						this.selectedDestination = statusesState.submitStatusDestinations[0];
					}
					if (this.activeCallId && this.activeCallId !== '0') {
						if (statusesState.submittingPersonStatus) {
							this.status = statusesState.submittingPersonStatus;
						}

						if (statusesState.submitStatusDestinations) {
							statusesState.submitStatusDestinations.forEach((destination) => {
								if (destination.id == this.activeCallId) {
									this.selectedDestination = destination;
								}
							});
						}
					}
				}
			});
	}

	dismissModal() {
		this.modal.dismiss();
	}

	compareWith(o1: StatusDestination, o2: StatusDestination) {
		return o1 && o2 ? o1.id === o2.id : o1 === o2;
	}

	public canSubmit(): boolean {
		if (this.status) {
			if (this.status.Note === 3 && !this.selectedDestination) {
				return false;
			}
		}

		return true;
	}

	setDestination() {
		if (this.canSubmit) {
			this.statusesStore
				.select(selectStatusesState)
				.pipe(take(1))
				.subscribe((state) => {
					if (this.selectedDestination && state.pendingSetPersonStatus) {
						let status = _.cloneDeep(state.pendingSetPersonStatus);
						status.destination = this.selectedDestination.id;
						status.destinationType = this.selectedDestination.type;

						this.statusesStore.dispatch(
							new StatusesActions.SubmitPersonStatusDesinationSet(
								status,
								state.submittingPersonStatus,
								this.selectedDestination
							)
						);
					}
				});
		}
	}
}
