import { Component, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { GetConfigResultData, MapDataAndMarkersData } from '@resgrid/ngx-resgridlib';
import { Observable, Subscription } from 'rxjs';
import { selectConfigData, selectHomeState, selectMappingState } from 'src/app/store';
import * as MappingActions from '../../actions/mapping.actions';
import { MappingState } from '../../store/mapping.store';
import * as L from 'leaflet';
import { environment } from 'src/environments/environment';
import { HomeState } from 'src/app/features/home/store/home.store';
import { take } from 'rxjs/operators';

@Component({
	selector: 'app-mapping-map',
	templateUrl: './map.page.html',
	styleUrls: ['./map.page.scss'],
})
export class MapPage {
	private mappingStateSub: Subscription;
	public mappingState$: Observable<MappingState | null>;
	public homeState$: Observable<HomeState | null>;
	public configData$: Observable<GetConfigResultData | null>;
	@ViewChild('map') mapContainer;
	public map: any;
	public markers: any[];

	constructor(private mappingStore: Store<MappingState>, private homeStore: Store<HomeState>) {
		this.mappingState$ = this.mappingStore.select(selectMappingState);
		this.homeState$ = this.homeStore.select(selectHomeState);
		this.configData$ = this.homeStore.select(selectConfigData);
		this.markers = new Array<any>();
	}

	ionViewDidEnter() {
		this.mappingStateSub = this.mappingState$.subscribe((state) => {
			if (state && state.mapData) {
				this.processMapData(state.mapData);
			}
		});

		this.mappingStore.dispatch(new MappingActions.LoadMapData());
	}

	ionViewDidLeave() {
		if (this.mappingStateSub) {
			this.mappingStateSub.unsubscribe();
			this.mappingStateSub = null;
		}
	}

	private processMapData(data: MapDataAndMarkersData) {
		if (data) {
			this.homeState$.pipe(take(1)).subscribe((homeState) => {
				this.configData$.pipe(take(1)).subscribe((configData) => {
					if (configData && configData.MapUrl) {
						var mapCenter = this.getMapCenter(data);

						if (!this.map) {
							this.map = L.map(this.mapContainer.nativeElement, {
								//dragging: false,
								doubleClickZoom: false,
								zoomControl: true,
							});

							L.tileLayer(configData.MapUrl, {
								crossOrigin: true,
								attribution: configData.MapAttribution,
							}).addTo(this.map);
						}

						//this.mapProvider.setMarkersForMap(this.map);

						//this.setMapBounds();

						//if (this.map) {
						this.map.setView(mapCenter, this.getMapZoomLevel(data));
						//}

						// clear map markers
						if (this.markers && this.markers.length >= 0) {
							for (var i = 0; i < this.markers.length; i++) {
								if (this.markers[i]) {
									this.map.removeLayer(this.markers[i]);
								}
							}

							this.markers = new Array<any>();
						}

						if (data.MapMakerInfos && data.MapMakerInfos.length > 0) {
							if (data && data.MapMakerInfos) {
								data.MapMakerInfos.forEach((markerInfo) => {
									let marker = L.marker([markerInfo.Latitude, markerInfo.Longitude], {
										icon: L.icon({
											iconUrl: 'assets/images/mapping/' + markerInfo.ImagePath + '.png',
											iconSize: [32, 37],
											iconAnchor: [16, 37],
										}),
										draggable: false,
										title: markerInfo.Title,
										//tooltip: markerInfo.Title,
									})
										.bindTooltip(markerInfo.Title, {
											permanent: true,
											direction: 'bottom',
										})
										.addTo(this.map);

									this.markers.push(marker);
								});
							}

							var group = L.featureGroup(this.markers);
							this.map.fitBounds(group.getBounds());
						}
					}
				});
			});
		}
	}

	private getMapCenter(data: MapDataAndMarkersData) {
		return [data.CenterLat, data.CenterLon];
	}

	private getMapZoomLevel(data: MapDataAndMarkersData): any {
		return data.ZoomLevel;
	}
}
