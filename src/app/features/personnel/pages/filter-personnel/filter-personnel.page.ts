import { Component, OnInit, Output } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { selectPersonnelState } from 'src/app/store';
import { PersonnelState } from '../../store/personnel.store';
import * as PersonnelActions from "../../../personnel/actions/personnel.actions";

@Component({
  selector: 'app-home-filter-personnel',
  templateUrl: './filter-personnel.page.html',
  styleUrls: ['./filter-personnel.page.scss'],
})
export class FilterPersonnelPage {
  public personnelState$: Observable<PersonnelState | null>;
  
  constructor(private personnelStore: Store<PersonnelState>
  ) {
    this.personnelState$ = this.personnelStore.select(selectPersonnelState);
  }

  ionViewDidEnter() {
    this.personnelStore.dispatch(
      new PersonnelActions.GetSavedPersonnelFilter()
    );

    this.personnelStore.dispatch(
      new PersonnelActions.GetPersonnelFilters()
    );
  }

  public closeModal() {
    this.personnelStore.dispatch(
      new PersonnelActions.DismissModal()
    );
  }

  public selectOption(event: any, id: string) {
    var checked = event.target.checked;

    this.personnelStore.dispatch(new PersonnelActions.UpdateSelectedFilterOption(id, checked));
  }
}
