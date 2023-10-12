import { Component, OnInit, Input } from '@angular/core';
import { UnitInfoResultData, UtilsService } from '@resgrid/ngx-resgridlib';
import { environment } from '../../../environments/environment';

@Component({
	selector: 'app-units-card',
	templateUrl: './units-card.component.html',
	styleUrls: ['./units-card.component.scss'],
})
export class UnitCardComponent implements OnInit {
	@Input() unit: UnitInfoResultData;
	
	constructor(private utilsProvider: UtilsService) {

	}

	ngOnInit() {}

	public getRolesString(roles: string[]): string {
		if (roles && roles.length > 0) {
			return roles.map((x) => x).join(', ');
		}

		return '';
	}

	public getDate(date) {
		return this.utilsProvider.getDate(date);
	}

	public getTimeago(date) {
		return this.utilsProvider.getTimeAgo(date);
	}

	getAvatarUrl(userId: string) {
		return environment.baseApiUrl + environment.resgridApiUrl + '/Avatars/Get?id=' + userId
	  }
}
