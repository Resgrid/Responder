import { Component, OnInit, Input } from '@angular/core';
import { CallProtocolsResultData, UtilsService } from '@resgrid/ngx-resgridlib';
import { environment } from '../../../environments/environment';

@Component({
	selector: 'app-protocols-card',
	templateUrl: './protocol-card.component.html',
	styleUrls: ['./protocol-card.component.scss'],
})
export class ProtocolCardComponent implements OnInit {
	@Input() protocol: CallProtocolsResultData;
	
	constructor(private utilsProvider: UtilsService) {

	}

	ngOnInit() {}

	public getDate(date) {
		return this.utilsProvider.formatDateForDisplay(
			new Date(date),
			'yyyy-MM-dd HH:mm Z'
		  );
	}

	public getTimeago(date) {
		return this.utilsProvider.getTimeAgo(date);
	}

	getAvatarUrl(userId: string) {
		return environment.baseApiUrl + environment.resgridApiUrl + '/Avatars/Get?id=' + userId
	  }
}
