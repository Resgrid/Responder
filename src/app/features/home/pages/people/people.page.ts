import { ChangeDetectorRef, Component } from '@angular/core';
import { MenuController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { PersonnelInfoResultData } from '@resgrid/ngx-resgridlib';
import { Observable } from 'rxjs';
import { PersonnelState } from 'src/app/features/personnel/store/personnel.store';
import { StorageProvider } from 'src/app/providers/storage';
import { selectPersonnelState } from 'src/app/store';
import * as PersonnelActions from "../../../personnel/actions/personnel.actions";

@Component({
  selector: 'app-home-people',
  templateUrl: 'people.page.html',
  styleUrls: ['people.page.scss']
})
export class PeoplePage {
  private searchTerm: string = '';
  public personnelState$: Observable<PersonnelState | null>;

  constructor(public menuCtrl: MenuController, private personnelStore: Store<PersonnelState>, 
    private storageProvider: StorageProvider, private cdr: ChangeDetectorRef) {
      this.personnelState$ = this.personnelStore.select(selectPersonnelState);
  }

  ionViewDidEnter() {
    this.load();
  }

  ionViewDidLeave() {
    this.personnelStore.dispatch(
      new PersonnelActions.ClearPersonnel()
    );
  }

  public refresh(event) {
    this.load();

    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }

  public showFilter() {
    this.personnelStore.dispatch(
      new PersonnelActions.ShowPersonnelFilterModal()
    );
  }

  public hideSearch() {
    this.searchTerm = '';
  }

  public search(event) {
    this.searchTerm = event.target.value;
    this.cdr.detectChanges();
  }

  public filterPersonnel(personnel: PersonnelInfoResultData[]) {
    if (this.searchTerm) {
      if (personnel) {
        let filteredPersonnel = new Array<PersonnelInfoResultData>();

        personnel.forEach(person => {
          if (person.IdentificationNumber && person.IdentificationNumber.toLowerCase().includes(this.searchTerm.toLowerCase())) {
            filteredPersonnel.push(person);
          } else if (person.FirstName && person.FirstName.toLowerCase().includes(this.searchTerm.toLowerCase())) {
            filteredPersonnel.push(person);
          } else if (person.LastName && person.LastName.toLowerCase().includes(this.searchTerm.toLowerCase())) {
            filteredPersonnel.push(person);
          } else if (person.GroupName && person.GroupName.toLowerCase().includes(this.searchTerm.toLowerCase())) {
            filteredPersonnel.push(person);
          } else if (person.EmailAddress && person.EmailAddress.toLowerCase().includes(this.searchTerm.toLowerCase())) {
            filteredPersonnel.push(person);
          } 
        });

        return filteredPersonnel;
      }
    } else {
      return personnel;
    }
  }

  public viewPerson(person: PersonnelInfoResultData) {
    this.personnelStore.dispatch(
      new PersonnelActions.ViewPerson(person)
    );
  }

  private async load() {
    let filter = await this.storageProvider.getPersonnelFilter();
    this.personnelStore.dispatch(
      new PersonnelActions.GetPersonnelList(filter)
    );
  }
}
