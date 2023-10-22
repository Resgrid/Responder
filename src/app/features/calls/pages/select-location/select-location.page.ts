import { Component, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import {
  selectCallsState,
  selectConfigData,
  selectEditCallLocationState,
  selectNewCallLocationState,
} from 'src/app/store';
import { GetConfigResultData } from '@resgrid/ngx-resgridlib';
import { SubSink } from 'subsink';
import * as _ from 'lodash';
import { take } from 'rxjs/operators';
import leaflet from 'leaflet';
import { GeolocationProvider } from 'src/app/providers/geolocation';
import * as CallsActions from '../../../../features/calls/actions/calls.actions';
import { CallsState } from '../../store/calls.store';
import { GeoLocation } from 'src/app/models/geoLocation';

@Component({
  selector: 'app-select-location',
  templateUrl: './select-location.page.html',
  styleUrls: ['./select-location.page.scss'],
})
export class SelectLocationPage {
  public callsState$: Observable<CallsState | null>;
  public newCallLocation$: Observable<GeoLocation | null>;
  public editCallLocation$: Observable<GeoLocation | null>;
  public configData$: Observable<GetConfigResultData | null>;
  private subs = new SubSink();

  private forNewCall: boolean = false;
  public map: any;
  public marker: any;
  @ViewChild('callMap') mapContainer;

  constructor(
    private callsStore: Store<CallsState>,
    private geolocationProvider: GeolocationProvider
  ) {
    this.callsState$ = this.callsStore.select(selectCallsState);
    this.newCallLocation$ = this.callsStore.select(selectNewCallLocationState);
    this.editCallLocation$ = this.callsStore.select(
      selectEditCallLocationState
    );
    this.configData$ = this.callsStore.select(selectConfigData);
  }

  async ionViewDidEnter() {
    await this.initMap();
  }

  ionViewDidLeave() {
    if (this.subs) {
      this.subs.unsubscribe();
    }
  }

  public closeModal() {
    this.callsStore.dispatch(new CallsActions.CloseSetLocationModal());
  }

  private async initMap() {
    this.configData$.pipe(take(1)).subscribe((configData) => {
      this.callsState$.pipe(take(1)).subscribe((state) => {
		this.forNewCall = state.setLocationModalForNewCall;
        if (state.setLocationModalForNewCall) {
          this.newCallLocation$.pipe(take(1)).subscribe((position) => {
            this.setMap(position, configData);
          });
        } else {
          this.editCallLocation$.pipe(take(1)).subscribe((position) => {
            this.setMap(position, configData);
          });
        }
      });
    });
  }

  private setMap(position: GeoLocation, configData: GetConfigResultData) {
    if (this.map) {
      this.map.off();
      this.map.remove();
      this.map = null;
    }

    this.map = leaflet.map(this.mapContainer.nativeElement, {
      dragging: true,
      doubleClickZoom: false,
      zoomControl: true,
    });

    leaflet
      .tileLayer(configData.MapUrl, {
        crossOrigin: true,
        attribution: configData.MapAttribution,
      })
      .addTo(this.map);

    this.map.setView([position.Latitude, position.Longitude], 16);
    const that = this;

    this.marker = leaflet
      .marker([position.Latitude, position.Longitude], {
        icon: new leaflet.icon({
          iconUrl: 'assets/images/mapping/Call.png',
          iconSize: [32, 37],
          iconAnchor: [16, 37],
        }),
        draggable: true,
      })
      .on('dragend', function (ev) {
        var chagedPos = ev.target.getLatLng();

		
        that.callsStore.dispatch(
          new CallsActions.SetNewCallLocation(chagedPos.lat, chagedPos.lng)
        );
      });

    this.marker.addTo(this.map);

    this.map.on('click', function (e) {
      if (that.marker) {
        that.marker.setLatLng(e.latlng);
      }

	  if (that.forNewCall) {
		that.callsStore.dispatch(
			new CallsActions.SetNewCallLocation(e.latlng.lat, e.latlng.lng)
		);
	  } else {
		that.callsStore.dispatch(
			new CallsActions.SetEditCallLocation(e.latlng.lat, e.latlng.lng)
		);
	  }
    });

    setTimeout(function () {
      //window.dispatchEvent(new Event('resize'));
      //that.map.invalidateSize.bind(that.map)
      that.map.invalidateSize();
    }, 500);
  }

  private addMarker(e) {
    // Add marker to map at click location; add popup window
    //var newMarker = new L.marker(e.latlng).addTo(map);

    if (this.marker) {
      this.marker.setLatLng(e.latlng);
    }

    this.callsStore.dispatch(
      new CallsActions.SetNewCallLocation(e.latlng.lat, e.latlng.lng)
    );
  }

  public setLocation() {
    this.callsStore.dispatch(new CallsActions.CloseSetLocationModal());
  }
}
