import { Component, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import {
  selectCallsState,
  selectConfigData,
  selectHomeState,
  selectNewCallDispatchesState,
  selectNewCallLocationState,
} from 'src/app/store';
import {
  GetConfigResultData,
  RecipientsResultData,
  UtilsService,
} from '@resgrid/ngx-resgridlib';
import { SubSink } from 'subsink';
import * as _ from 'lodash';
import { environment } from 'src/environments/environment';
import { take } from 'rxjs/operators';
import { AlertProvider } from 'src/app/providers/alert';
import leaflet from 'leaflet';
import { GeolocationProvider } from 'src/app/providers/geolocation';
import { CallsState } from '../../store/calls.store';
import * as CallsActions from '../../../../features/calls/actions/calls.actions';
import { GeoLocation } from 'src/app/models/geoLocation';
import { HomeState } from 'src/app/features/home/store/home.store';

@Component({
  selector: 'app-new-call',
  templateUrl: './new-call.page.html',
  styleUrls: ['./new-call.page.scss'],
})
export class NewCallPage {
  public callsState$: Observable<CallsState | null>;
  public homeState$: Observable<HomeState | null>;
  public dispatches$: Observable<RecipientsResultData[] | null>;
  public newCallLocation$: Observable<GeoLocation | null>;
  public configData$: Observable<GetConfigResultData | null>;
  private subs = new SubSink();
  public note: string;
  public userId: string;
  public recipientList: string;
  public type: string = 'No Type';
  public priority: string = '0';
  public subject: string = '';
  public body: string = '';
  public callId: string = '';
  public contactName: string = '';
  public contactNumber: string = '';
  public address: string = '';
  public w3w: string = '';
  public lat: string = '';
  public lon: string = '';
  public plus: string = '';

  public locationType: string = 'address';

  public mapImgWidth: number;
  public mapImgHeight: number;
  public mapImgSrc: string;
  public map: any;
  public marker: any;
  @ViewChild('callMap') mapContainer;

  constructor(
    private callsStore: Store<CallsState>,
    private homeStore: Store<HomeState>,
    private utilsProvider: UtilsService,
    private alertProvider: AlertProvider,
    private geolocationProvider: GeolocationProvider
  ) {
    this.callsState$ = this.callsStore.select(selectCallsState);
    this.homeState$ = this.homeStore.select(selectHomeState);
    this.dispatches$ = this.callsStore.select(selectNewCallDispatchesState);
    this.newCallLocation$ = this.callsStore.select(selectNewCallLocationState);
    this.configData$ = this.homeStore.select(selectConfigData);
  }

  async ionViewDidEnter() {
    this.recipientList = 'Select Recipients...';
    this.type = '0';
    this.subject = '';
    this.body = '';

    await this.initMap();

    this.subs.sink = this.newCallLocation$.subscribe((newCallLocation) => {
      if (newCallLocation && this.map && this.marker) {
        if (this.map.hasLayer(this.marker)) {
          this.map.removeLayer(this.marker);
        }

        this.marker = leaflet.marker(
          [newCallLocation.Latitude, newCallLocation.Longitude],
          {
            icon: new leaflet.icon({
              iconUrl: '/assets/mapping/Call.png',
              iconSize: [32, 37],
              iconAnchor: [16, 37],
            }),
            draggable: false,
          }
        );

        this.marker.addTo(this.map);
        this.map.setView(
          [newCallLocation.Latitude, newCallLocation.Longitude],
          16
        );
      }
    });

    this.subs.sink = this.dispatches$.subscribe((recipients) => {
      if (recipients && recipients.length > 0) {
        this.recipientList = '';

        recipients.forEach((recipient) => {
          if (recipient.Selected) {
            if (this.recipientList.length > 0) {
              this.recipientList += ', ' + recipient.Name;
            } else {
              this.recipientList += recipient.Name;
            }
          }
        });

        if (this.recipientList.length === 0) {
          this.recipientList = 'Select Recipients...';
        }
      } else {
        this.recipientList = 'Select Recipients...';
      }
    });
  }

  ionViewDidLeave() {
    if (this.subs) {
      this.subs.unsubscribe();
    }
  }

  public closeModal() {
    this.callsStore.dispatch(new CallsActions.CloseNewCallModal());
  }

  public selectRecipients() {
    this.callsState$.pipe(take(1)).subscribe((callsState) => {
      if (
        callsState &&
        callsState.newCallWhoDispatch &&
        callsState.newCallWhoDispatch.length > 0
      ) {
        this.callsStore.dispatch(
          new CallsActions.ShowSelectDispatchesSuccess(null)
        );
      } else {
        this.callsStore.dispatch(new CallsActions.ShowSelectDispatches());
      }
    });
  }

  public findCoordinates() {
    if (this.lat && this.lon) {
      if (
        this.lat.includes('°') ||
        this.lat.includes("'") ||
        this.lat.includes('"') ||
        this.lon.includes('°') ||
        this.lon.includes("'") ||
        this.lon.includes('"')
      ) {
		this.alertProvider.showOkAlert('Coordinates Error', '', 'It looks like you entered your coorinates in DMS (Degrees, Minutes, Seconds) format. Please enter coordinates in decimal format.');
      } else {
        this.callsStore.dispatch(
          new CallsActions.SetNewCallLocation(
            parseInt(this.lat),
            parseInt(this.lon)
          )
        );
      }
    }
  }

  public findCoordinatesForAddress() {
	this.callsStore.dispatch(
		new CallsActions.GetCoordinatesForAddress(this.address)
	  );
  }

  public findCoordinatesForW3W() {
	this.callsStore.dispatch(
		new CallsActions.GetCoordinatesForW3W(this.w3w)
	  );
  }

  public findCoordinatesForPlus() {
	this.callsStore.dispatch(
		new CallsActions.GetCoordinatesForPlus(this.plus)
	  );
  }

  public send() {
    if (this.subject.length === 0) {
      this.alertProvider.showErrorAlert(
        'New Call Error',
        '',
        'You must supply a name for the call.'
      );
      return;
    }
    if (this.body.length === 0) {
      this.alertProvider.showErrorAlert(
        'New Call Error',
        '',
        'You must supply a nature for the call.'
      );
      return;
    }
    this.callsState$.pipe(take(1)).subscribe((callsState) => {
      let dispatchList = '';

      if (
        callsState &&
        callsState.newCallWhoDispatch &&
        callsState.newCallWhoDispatch.length > 0
      ) {
        callsState.newCallWhoDispatch.forEach((recipient) => {
          if (recipient.Selected) {
            if (dispatchList.length > 0) {
              dispatchList = dispatchList.concat(`|${recipient.Id}`);
            } else {
              dispatchList = `${recipient.Id}`;
            }
          }
        });
      }

      this.callsState$.pipe(take(1)).subscribe((callsState) => {
        if (callsState) {
          if (callsState.newCallLocation) {
            this.callsStore.dispatch(
              new CallsActions.DispatchCall(
                this.subject,
                parseInt(this.priority),
                this.type,
                this.contactName,
                this.contactNumber,
                this.callId,
                null,
                null,
                this.body,
                null,
                this.address,
                this.w3w,
                callsState.newCallLocation.Latitude,
                callsState.newCallLocation.Longitude,
                dispatchList,
                null,
                null
              )
            );
          } else {
          }
        }
      });
    });
  }

  private async initMap() {
    let position = await this.geolocationProvider.getLocation();

    this.configData$.pipe(take(1)).subscribe((configData) => {
      if (this.map) {
        this.map.off();
        this.map.remove();
        this.map = null;
      }

      if (!position) {
        position = new GeoLocation(0, 0);
      } //TODO: Stop gap, should get a location from the department info somewhere

      if (position) {
        this.callsStore.dispatch(
          new CallsActions.SetNewCallLocation(
            position.Latitude,
            position.Longitude
          )
        );
      }

      this.map = leaflet.map(this.mapContainer.nativeElement, {
        dragging: false,
        doubleClickZoom: false,
        zoomControl: false,
      });

      leaflet
        .tileLayer(configData.MapUrl, {
          minZoom: 16,
          maxZoom: 16,
          crossOrigin: true,
          attribution: configData.MapAttribution,
        })
        .addTo(this.map);

      if (position) {
        this.map.setView([position.Latitude, position.Longitude], 16);

        this.marker = leaflet.marker([position.Latitude, position.Longitude], {
          icon: new leaflet.icon({
            iconUrl: '/assets/mapping/Call.png',
            iconSize: [32, 37],
            iconAnchor: [16, 37],
          }),
          draggable: false,
        });

        this.marker.addTo(this.map);
      }

      const that = this;
      setTimeout(function () {
        //window.dispatchEvent(new Event('resize'));
        //that.map.invalidateSize.bind(that.map)
        that.map.invalidateSize();
      }, 500);
    });
  }

  public showSetLocationModal() {
    this.newCallLocation$.pipe(take(1)).subscribe((newCallLocation) => {
      this.callsStore.dispatch(new CallsActions.ShowSetLocationModal(true, newCallLocation.Latitude, newCallLocation.Longitude));
    });
  }
}
