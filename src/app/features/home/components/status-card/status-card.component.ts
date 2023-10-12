import { Component, OnInit, Input } from '@angular/core';
import { Store } from '@ngrx/store';
import { UnitResultData, UnitStatusResultData } from '@resgrid/ngx-resgridlib';
import { Observable } from 'rxjs';
import { selectCurrentUnitStatus, selectHomeState } from 'src/app/store';
import { HomeState } from '../../store/home.store';

@Component({
  selector: 'app-home-status-card',
  templateUrl: './status-card.component.html',
  styleUrls: ['./status-card.component.scss'],
})
export class StatusCardComponent implements OnInit {
  public homeState$: Observable<HomeState | null>;

  @Input() color: string = 'gray';
  @Input() status: string = 'Unknown';

  constructor(private homeStore: Store<HomeState>) {
    this.homeState$ = this.homeStore.select(selectHomeState);

  }


ngOnInit() {
  /*
  this.homeState$.subscribe(state => {
    if (state && state.currentStatus) {
      if (state.currentStatus.StateStyle === 'label-danger') {
        this.color = '#ED5565';
      } else if (state.currentStatus.StateStyle === 'label-info') {
        this.color = '#23c6c8';
      } else if (state.currentStatus.StateStyle === 'label-warning') {
        this.color = '#f8ac59';
      } else if (state.currentStatus.StateStyle === 'label-success') {
        this.color = '#449d44';
      } else if (state.currentStatus.StateStyle === 'label-onscene') {
        this.color = '#449d44';
      } else if (state.currentStatus.StateStyle === 'label-primary') {
        this.color = '#228BCB';
      } else if (state.currentStatus.StateStyle === 'label-returning') {
        this.color = '';
      } else if (state.currentStatus.StateStyle === 'label-default') {
        this.color = '#262626';
      } else if (state.currentStatus.StateStyle === 'label-enroute') {
        this.color = '#449d44';
      } else {
        this.color = state.currentStatus.StateStyle;
      }

      this.status = state.currentStatus.State;
    } else {
      this.color = '#262626';
      this.status = 'Unknown';
    }
  });
  */
}

}
