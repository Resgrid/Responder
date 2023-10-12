import { Component } from '@angular/core';
import { HomeState } from '../../store/home.store';
import { Store } from '@ngrx/store';
import { UtilsService } from '@resgrid/ngx-resgridlib';
import { MapProvider } from 'src/app/providers/map';
import { MenuController } from '@ionic/angular';
import { Observable } from 'rxjs';
import { selectHomeState } from 'src/app/store';
import { SubSink } from 'subsink';

@Component({
  selector: 'app-home-status',
  templateUrl: 'status.page.html',
  styleUrls: ['status.page.scss'],
})
export class StatusPage {
  public activeSegment: string = 'status';
  public homeState$: Observable<HomeState | null>;
  private subs = new SubSink();

  constructor(
    public menu: MenuController,
    private homeStore: Store<HomeState>) {
    this.homeState$ = this.homeStore.select(selectHomeState);
  }

  ionViewWillEnter() {
    this.subs.sink = this.homeState$.subscribe(state => {
      if (state) {

      }
    });
  }

  ionViewDidEnter() {

  }

  ionViewWillLeave() {

  }
}
