import { Component, OnInit, Output, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subscription } from 'rxjs';
import { selectProtocolsState } from 'src/app/store';
import { ProtocolsState } from '../../store/protocols.store';
import * as ProtocolActions from '../../actions/protocols.actions';
import { CallProtocolsResultData } from '@resgrid/ngx-resgridlib';

@Component({
	selector: 'app-protocols-list',
	templateUrl: './protocols.page.html',
	styleUrls: ['./protocols.page.scss'],
})
export class ProtocolsPage {
	private mappingStateSub: Subscription;
	public protocolsState$: Observable<ProtocolsState | null>;

	constructor(private protocolsStore: Store<ProtocolsState>) {
		this.protocolsState$ = this.protocolsStore.select(selectProtocolsState);
	}

	ionViewDidEnter() {
		this.protocolsStore.dispatch(new ProtocolActions.LoadProtocols());
	}

	ionViewDidLeave() {}

	public viewProtocol(protocol: CallProtocolsResultData) {
		if (protocol) {
			this.protocolsStore.dispatch(new ProtocolActions.ViewProtocol(protocol));
		}
	}
}
