import { Component, OnInit, Output } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { selectUnitsState } from 'src/app/store';
import { UnitsState } from '../../store/units.store';
import * as UnitsActions from "../../../units/actions/units.actions";

@Component({
  selector: 'app-home-filter-units',
  templateUrl: './filter-units.page.html',
  styleUrls: ['./filter-units.page.scss'],
})
export class FilterUnitsPage {
  public unitsState$: Observable<UnitsState | null>;
  
  constructor(private unitsStore: Store<UnitsState>
  ) {
    this.unitsState$ = this.unitsStore.select(selectUnitsState);
  }

  ionViewDidEnter() {
    this.unitsStore.dispatch(
      new UnitsActions.GetSavedUnitsFilter()
    );

    this.unitsStore.dispatch(
      new UnitsActions.GetUnitsFilters()
    );
  }

  public closeModal() {
    this.unitsStore.dispatch(
      new UnitsActions.DismissModal()
    );
  }

  public selectOption(event: any, id: string) {
    var checked = event.target.checked;

    this.unitsStore.dispatch(new UnitsActions.UpdateSelectedFilterOption(id, checked));
  }
}
