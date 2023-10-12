import { Component, OnInit, Input } from '@angular/core';
import { NoteResultData, UtilsService } from '@resgrid/ngx-resgridlib';
import { environment } from '../../../environments/environment';

@Component({
	selector: 'app-note-card',
	templateUrl: './note-card.component.html',
	styleUrls: ['./note-card.component.scss'],
})
export class NoteCardComponent implements OnInit {
	@Input() note: NoteResultData;
	
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
