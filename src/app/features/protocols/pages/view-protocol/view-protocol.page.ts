import { Component, OnInit, Output, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subscription } from 'rxjs';
import { selectProtocolsState } from 'src/app/store';
import { ProtocolsState } from '../../store/protocols.store';
import * as ProtocolActions from '../../actions/protocols.actions';
import { FileProvider } from 'src/app/providers/file';

@Component({
	selector: 'app-protocols-view-protocol',
	templateUrl: './view-protocol.page.html',
	styleUrls: ['./view-protocol.page.scss'],
})
export class ViewProtocolPage {
	public tabType: string = 'text';
	public protocolsState$: Observable<ProtocolsState | null>;

	constructor(private protocolsStore: Store<ProtocolsState>,
				private fileProvider: FileProvider) {
		this.protocolsState$ = this.protocolsStore.select(selectProtocolsState);
	}

	ionViewDidEnter() {}

	ionViewDidLeave() {}

	public closeModal() {
		this.protocolsStore.dispatch(new ProtocolActions.DismissModal());
	}

	public async viewAttachment(name: string, id: string) {
		await this.fileProvider.openProtocolAttachment(name, id);
	}
}
