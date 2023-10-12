import { ChangeDetectorRef, Component } from '@angular/core';
import { MenuController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { UnitInfoResultData } from '@resgrid/ngx-resgridlib';
import { Observable } from 'rxjs';
import { PersonnelState } from 'src/app/features/personnel/store/personnel.store';
import { UnitsState } from 'src/app/features/units/store/units.store';
import { StorageProvider } from 'src/app/providers/storage';
import { selectPersonnelState, selectUnitsState } from 'src/app/store';
import * as UnitsActions from "../../../units/actions/units.actions";

@Component({
  selector: 'app-home-units',
  templateUrl: 'units.page.html',
  styleUrls: ['units.page.scss']
})
export class UnitsPage {
  private searchTerm: string = '';
  public unitsState$: Observable<UnitsState | null>;

  constructor(public menuCtrl: MenuController, private unitsStore: Store<UnitsState>, 
    private storageProvider: StorageProvider, private cdr: ChangeDetectorRef) {
    this.unitsState$ = this.unitsStore.select(selectUnitsState);
  }

  ionViewWillEnter() {
    this.load();
  }

  ionViewDidLeave() {
    this.unitsStore.dispatch(
      new UnitsActions.ClearUnits()
    );
  }

  refresh(event) {
    this.load();

    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }

  public showFilter() {
    this.unitsStore.dispatch(
      new UnitsActions.ShowUnitsFilterModal()
    );
  }

  public hideSearch() {
    this.searchTerm = '';
  }

  public search(event) {
    this.searchTerm = event.target.value;
    this.cdr.detectChanges();
  }

  public filterUnits(units: UnitInfoResultData[]) {
    if (this.searchTerm) {
      if (units) {
        let filteredUnits = new Array<UnitInfoResultData>();

        units.forEach(unit => {
          if (unit.Name && unit.Name.toLowerCase().includes(this.searchTerm.toLowerCase())) {
            filteredUnits.push(unit);
          } else if (unit.Type && unit.Type.toLowerCase().includes(this.searchTerm.toLowerCase())) {
            filteredUnits.push(unit);
          } else if (unit.PlateNumber && unit.PlateNumber.toLowerCase().includes(this.searchTerm.toLowerCase())) {
            filteredUnits.push(unit);
          } else if (unit.CurrentDestinationName && unit.CurrentDestinationName.toLowerCase().includes(this.searchTerm.toLowerCase())) {
            filteredUnits.push(unit);
          } else if (unit.CurrentStatus && unit.CurrentStatus.toLowerCase().includes(this.searchTerm.toLowerCase())) {
            filteredUnits.push(unit);
          } 
        });

        return filteredUnits;
      }
    } else {
      return units;
    }
  }

  public viewUnit(person: UnitInfoResultData) {
    this.unitsStore.dispatch(
      new UnitsActions.ViewUnit(person)
    );
  }

  private async load() {
    let filter = await this.storageProvider.getUnitFilter();
    this.unitsStore.dispatch(
      new UnitsActions.GetUnitsList(filter)
    );
  }
}
