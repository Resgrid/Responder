import { Component, OnInit, Input, ElementRef, Renderer2, ChangeDetectionStrategy } from '@angular/core';
import { PersonnelInfoResultData, UtilsService } from '@resgrid/ngx-resgridlib';
import { environment } from '../../../environments/environment';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'app-person-card',
	templateUrl: './person-card.component.html',
	styleUrls: ['./person-card.component.scss'],
})
export class PersonCardComponent implements OnInit {
	@Input() person: PersonnelInfoResultData;

	constructor(private utilsProvider: UtilsService, private elementRef: ElementRef, private renderer: Renderer2) {}

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
		return environment.baseApiUrl + environment.resgridApiUrl + '/Avatars/Get?id=' + userId;
	}

	adjustColor(color: string) {
		if (color) {
			//const btnElement = (<HTMLElement>this.elementRef.nativeElement).querySelector('[data-id="bodyEle"]');
			const bodyElement = this.elementRef.nativeElement.closest('body');

			if (bodyElement && bodyElement.classList) {
				const isDarkMode = bodyElement.classList.contains('dark'); //btnElement.classList.contains('dark');
				if (isDarkMode) {
					if (this.utilsProvider.isColorDark(color)) {
						return this.LightenDarkenColor(color, 80);
					} else {
						return color;
					}
				}
			}
			return color;
		}
	}

	private LightenDarkenColor(col, amt) {
		var usePound = false;
		if (col[0] == '#') {
			col = col.slice(1);
			usePound = true;
		}

		var num = parseInt(col, 16);

		var r = (num >> 16) + amt;

		if (r > 255) r = 255;
		else if (r < 0) r = 0;

		var b = ((num >> 8) & 0x00ff) + amt;

		if (b > 255) b = 255;
		else if (b < 0) b = 0;

		var g = (num & 0x0000ff) + amt;

		if (g > 255) g = 255;
		else if (g < 0) g = 0;

		return (usePound ? '#' : '') + (g | (b << 8) | (r << 16)).toString(16);
	}
}
