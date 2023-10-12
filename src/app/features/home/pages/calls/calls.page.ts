import { ChangeDetectorRef, Component } from '@angular/core';
import { MenuController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { CallPriorityResultData, CallResultData, SecurityService } from '@resgrid/ngx-resgridlib';
import { Observable } from 'rxjs';
import { CallAndPriorityData } from 'src/app/features/calls/models/callAndPriorityData';
import { CallsState } from 'src/app/features/calls/store/calls.store';
import { selectCallsState } from 'src/app/store';
import * as CallsActions from "../../../../features/calls/actions/calls.actions";

@Component({
  selector: 'app-home-calls',
  templateUrl: 'calls.page.html',
  styleUrls: ['calls.page.scss']
})
export class CallsPage {
  private searchTerm: string = '';
  public callsState$: Observable<CallsState | null>;

  constructor(public menuCtrl: MenuController, 
              private callsStore: Store<CallsState>, 
              private cdr: ChangeDetectorRef,
              private securityService: SecurityService) {
    this.callsState$ = this.callsStore.select(selectCallsState);
  }

  ionViewWillEnter() {
    this.load();
  }

  ionViewDidLeave() {
    this.callsStore.dispatch(
      new CallsActions.ClearCalls()
    );
  }

  public viewCall(callId) {
    this.callsStore.dispatch(
      new CallsActions.GetCallById(callId)
    );
  }

  public newCall() {
    this.callsStore.dispatch(
      new CallsActions.ShowNewCallModal()
    );
  }

  public canCreateCall() {
    return this.securityService.canUserCreateCalls();
  }

  public filterCalls(calls: CallAndPriorityData[]) {
    if (this.searchTerm) {
      if (calls) {
        let filteredCalls = new Array<CallAndPriorityData>();

        calls.forEach(call => {
          if (call.Call.Name && call.Call.Name.toLowerCase().includes(this.searchTerm.toLowerCase())) {
            filteredCalls.push(call);
          } else if (call.Call.Nature && call.Call.Nature.toLowerCase().includes(this.searchTerm.toLowerCase())) {
            filteredCalls.push(call);
          } else if (call.Call.ExternalId && call.Call.ExternalId.toLowerCase().includes(this.searchTerm.toLowerCase())) {
            filteredCalls.push(call);
          } else if (call.Call.IncidentId && call.Call.IncidentId.toLowerCase().includes(this.searchTerm.toLowerCase())) {
            filteredCalls.push(call);
          } else if (call.Call.Number && call.Call.Number.toLowerCase().includes(this.searchTerm.toLowerCase())) {
            filteredCalls.push(call);
          } else if (call.Call.ContactName && call.Call.ContactName.toLowerCase().includes(this.searchTerm.toLowerCase())) {
            filteredCalls.push(call);
          } else if (call.Call.ContactInfo && call.Call.ContactInfo.toLowerCase().includes(this.searchTerm.toLowerCase())) {
            filteredCalls.push(call);
          } else if (call.Call.Address && call.Call.Address.toLowerCase().includes(this.searchTerm.toLowerCase())) {
            filteredCalls.push(call);
          } else if (call.Call.Nature && call.Call.Nature.toLowerCase().includes(this.searchTerm.toLowerCase())) {
            filteredCalls.push(call);
          } else if (call.Call.Note && call.Call.Note.toLowerCase().includes(this.searchTerm.toLowerCase())) {
            filteredCalls.push(call);
          } 
        });

        return filteredCalls;
      }
    } else {
      return calls;
    }
  }

  public hideSearch() {
    this.searchTerm = '';
  }

  public search(event) {
    this.searchTerm = event.target.value;
    this.cdr.detectChanges();
  }

  public refresh(event) {
    this.load();

    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }

  private async load() {
    this.callsStore.dispatch(
      new CallsActions.GetCalls()
    );
  }
}
