import { Component, OnInit, Input } from '@angular/core';
import { PersonnelInfoResultData, UtilsService } from '@resgrid/ngx-resgridlib';
import { environment } from '../../../environments/environment';

@Component({
	selector: 'app-person-card',
	templateUrl: './person-card.component.html',
	styleUrls: ['./person-card.component.scss'],
})
export class PersonCardComponent implements OnInit {
	@Input() person: PersonnelInfoResultData;
	
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
