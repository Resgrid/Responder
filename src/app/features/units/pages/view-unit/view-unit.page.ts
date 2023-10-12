import { Component, OnInit, Output } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { selectUnitsState } from 'src/app/store';
import { UnitsState } from '../../store/units.store';
import * as UnitsActions from "../../actions/units.actions";
import { environment } from '../../../../../environments/environment';
import { UtilsService } from '@resgrid/ngx-resgridlib';

@Component({
  selector: 'app-home-view-unit',
  templateUrl: './view-unit.page.html',
  styleUrls: ['./view-unit.page.scss'],
})
export class ViewUnitPage {
  public unitsState$: Observable<UnitsState | null>;
  
  constructor(private unitsStore: Store<UnitsState>,
    private utilsProvider: UtilsService
  ) {
    this.unitsState$ = this.unitsStore.select(selectUnitsState);
  }

  ionViewDidEnter() {

  }

  public closeModal() {
    this.unitsStore.dispatch(
      new UnitsActions.DismissModal()
    );
  }

  public getDate(date) {
		return this.utilsProvider.getDate(date);
	}

	public getTimeago(date) {
		return this.utilsProvider.getTimeAgo(date);
	}

  public getRolesString(roles: string[]): string {
		if (roles && roles.length > 0) {
			return roles.map((x) => x).join(', ');
		}

		return '';
	}

  public getAvatarUrl(userId: string) {
		return (
			environment.baseApiUrl +
			environment.resgridApiUrl +
			'/Avatars/Get?id=' +
			userId
		);
	}
}
