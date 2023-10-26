import { Component, OnInit, Output } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { selectPersonnelState } from 'src/app/store';
import { PersonnelState } from '../../store/personnel.store';
import * as PersonnelActions from "../../actions/personnel.actions";
import { environment } from '../../../../../environments/environment';
import { PersonnelInfoResultData, UtilsService } from '@resgrid/ngx-resgridlib';

@Component({
  selector: 'app-home-view-person',
  templateUrl: './view-person.page.html',
  styleUrls: ['./view-person.page.scss'],
})
export class ViewPersonPage {
  public personnelState$: Observable<PersonnelState | null>;
  
  constructor(private personnelStore: Store<PersonnelState>,
    private utilsProvider: UtilsService
  ) {
    this.personnelState$ = this.personnelStore.select(selectPersonnelState);
  }

  ionViewDidEnter() {

  }

  public closeModal() {
    this.personnelStore.dispatch(
      new PersonnelActions.DismissModal()
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

		return 'No Roles for User';
	}

  public getGroupString(person: PersonnelInfoResultData): string {
		if (person && person.GroupName) {
			return person.GroupName;
		}

		return 'User is not in a Group';
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
