import { AfterViewInit, Component, ViewChild } from '@angular/core';
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';
import { GeoLocation } from 'src/app/models/geoLocation';
import { environment } from 'src/environments/environment.prod';
import { Observable, Subscription } from 'rxjs';
import { HomeState } from '../../store/home.store';
import { Store } from '@ngrx/store';
import * as HomeActions from '../../actions/home.actions';
import { GetConfigResultData, UtilsService } from '@resgrid/ngx-resgridlib';
import { MapProvider } from 'src/app/providers/map';
import { MenuController } from '@ionic/angular';
import { SubSink } from 'subsink';

@Component({
  selector: 'app-home-map',
  templateUrl: 'map.page.html',
  styleUrls: ['map.page.scss'],
})
export class MapPage {
  public configData$: Observable<GetConfigResultData | null>;

  private subs = new SubSink();

  private lastMapUpdateTimestamp: any;
  private creatingMap: boolean = false;
  private configData: GetConfigResultData = null;

  public position: GeoLocation;
  public map: any;
  public vehicleMarker: any;
  public userMovedMap: boolean = false;
  public isInitialLoad: boolean = true;
  @ViewChild('vehicleMap') mapContainer;

  constructor(
    private store: Store<HomeState>,
    private utilsProvider: UtilsService,
    private mapProvider: MapProvider,
    public menu: MenuController
  ) {

  }

  ionViewWillEnter() {
    this.isInitialLoad = true;
    this.menu.enable(true);
    this.loadMap();
  }

  ionViewDidEnter() {
    this.subs.sink = this.configData$.subscribe((config) => {
      if (config) {
        this.configData = config;

        if (this.configData && this.configData.NavigationMapKey) {
          if (!this.map && !this.creatingMap) {
            this.loadMap();
          }
        }
      }
    });
  }

  ionViewWillLeave() {
    if (this.subs) {
      this.subs.unsubscribe();
    }
  }

  public loadAPIWrapper(map) {
    this.map = map;
  }

  public resetMap() {
    this.map = null;
    this.vehicleMarker = null;
    this.userMovedMap = false;
  }

  private async loadMap() {
    //let position = await this.geoProvider.getLocation();
    const that = this;

    if (this.configData && this.configData.NavigationMapKey) {
      if (!this.creatingMap) {
        if (this.map) {
          this.resetMap();
        }

        this.creatingMap = true;
        this.userMovedMap = false;
        this.lastMapUpdateTimestamp = new Date();

        setTimeout(function () {
          mapboxgl.accessToken = that.configData.NavigationMapKey;
          that.map = new mapboxgl.Map({
            container: 'vehicleMap',
            style: 'mapbox://styles/mapbox/streets-v11',
            zoom: 13,
          });
          that.map.addControl(new mapboxgl.NavigationControl());

          that.setMapEvents();
          that.mapProvider.setImages(that.map);
          that.creatingMap = false;

          that.mapProvider.setMarkersForMap(
            that.map,
            that.position,
            that.userMovedMap
          );

          if (that.map) {
            that.map.resize();
            that.map.triggerRepaint();
          }
        }, 500);
      }

      setTimeout(function () {
        if (that.map) {
          that.map.resize();
          that.map.triggerRepaint();
        }
      }, 1500);
    } else {
      setTimeout(function () {
        that.loadMap();
      }, 500);
    }
  }

  public onResize(event) {
    if (this.map) {
      const that = this;
      setTimeout(function () {
        that.map.resize();
        that.map.triggerRepaint();
      }, 500);
    }
  }

  public refreshMap() {
    this.mapProvider.setMarkersForMap(
      this.map,
      this.position,
      this.userMovedMap
    );

    this.lastMapUpdateTimestamp = new Date();
  }

  public resetOnVehicle() {
    this.userMovedMap = false;

    if (this.map) {
      this.map.jumpTo({
        center: new mapboxgl.LngLat(
          this.position.Longitude,
          this.position.Latitude
        ),
        essential: true,
      });
      this.map.setZoom(13);
    }
  }

  public seeAll() {
    this.userMovedMap = true;

    let bounds = this.mapProvider.coordinates.reduce(function (bounds, coord) {
      return bounds.extend(coord);
    }, new mapboxgl.LngLatBounds(
      this.mapProvider.coordinates[0],
      this.mapProvider.coordinates[1]
    ));

    this.map.fitBounds(bounds, {
      padding: 40,
    });
  }

  private setMapEvents() {
    const that = this;

    this.map.on('load', function () {
      //that.mapProvider.setMarkersForMap(that.map);
    });

    this.map.on('touchend', function (data) {
      //var e = (data && data.originalEvent) || {};
      that.userMovedMap = true;
    });

    this.map.on('touchmove', function (data) {
      //var e = (data && data.originalEvent) || {};
      that.userMovedMap = true;
    });

    this.map.on('mousedown', function (data) {
      //var e = (data && data.originalEvent) || {};
      that.userMovedMap = true;
    });

    this.map.on('zoomend', function (data) {
      //var e = (data && data.originalEvent) || {};
      that.userMovedMap = true;
    });

    this.map.on('zoom', function (data) {
      //var e = (data && data.originalEvent) || {};
      that.userMovedMap = true;
    });

    this.map.on('moveend', function (data) {
      //var e = (data && data.originalEvent) || {};
      that.userMovedMap = true;
    });

    this.map.on('move', function (data) {
      //var e = (data && data.originalEvent) || {};
      that.userMovedMap = true;
    });
  }

  private updateMarkerDirection(oldLng, oldLat, newLng, newLat) {
    let el = this.vehicleMarker.getElement();

    if (!oldLat || !oldLng) {
      oldLng = newLng;
      oldLat = newLat;
    }

    const angle =
      turf.rhumbBearing(
        turf.point([oldLat, oldLng]),
        turf.point([newLat, newLng])
      ) + 180;

    let carDirection = angle - this.map.getBearing();
    if (el.style.transform.includes('rotate')) {
      el.style.transform = el.style.transform.replace(
        /rotate(.*)/,
        'rotate(' + carDirection + 'deg)'
      );
    } else {
      el.style.transform =
        el.style.transform + 'rotate(' + carDirection + 'deg)';
    }
  }

  private createUpdateVehicleMarker(latitude, longitude, angle) {
    if (!this.vehicleMarker) {
      let el = document.createElement('div');
      el.className = 'carmarker';
      el.style.backgroundSize = '100%';
      el.style.width = `24px`;
      el.style.height = `50px`;
      el.style.backgroundImage = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 399.5 841.9'%3E%3CradialGradient id='a' cx='198.55' cy='420.944' r='327.4' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%23c91515'/%3E%3Cstop offset='.17' stop-color='%23c01313'/%3E%3Cstop offset='.442' stop-color='%23a90e0e'/%3E%3Cstop offset='.78' stop-color='%23830606'/%3E%3Cstop offset='1' stop-color='%23670000'/%3E%3C/radialGradient%3E%3Cpath fill='url(%23a)' d='M198.6 0c-41.6-.5-74.1 6-95.7 11.8C74.6 19.6 64 26.6 56.5 33.7c-20.1 18.9-24.7 44.3-26 56v447.4l-24.1-8.2c-5.3 21.2 24.1 30 24.1 30v128.4c-.3 8-1.8 74.8 52.8 120.7 49 41.1 106.1 33.2 115.5 33.2 9.4 0 66.6 7.8 115.5-33.2 54.7-45.9 53.2-112.7 52.8-120.7v-129l12.3-6.2c6-3 10-8.8 10.8-15.5l1.1-9.5-24.1 7.7v-445c-1.3-11.8-5.8-37.1-26-56-7.6-7.1-18.2-14.1-46.5-21.9C273.3 6 240.7-.5 199.2 0'/%3E%3Cpath opacity='.65' fill='%23161616' d='M327.6 622c-7.1-65.8-13.6-132.7-19.1-198.6-7.7-91-13.9-181.4-18.6-268.8l3.6-.2c4.6 87.3 10.9 177.7 18.6 268.7 5.6 65.9 12 132.7 19.1 198.5l-3.6.4z'/%3E%3Cpath opacity='.5' fill='%23EBEBEB' d='M198.7 128.1c-9.4-.2-18.8-.8-28.4 1.9-7.5 2.1-11 4.7-14.3 2.7-6-3.4-7-18.5 0-26 2.2-2.3 4.9-3.7 11.4-5.2 7-1.7 17.6-2.3 31.5-2.3 13.9-.1 24.5.6 31.5 2.3 6.5 1.5 9.2 2.9 11.4 5.2 7 7.5 6 22.5 0 26-3.4 1.9-6.9-.6-14.3-2.7-9.7-2.6-19.4-2.1-28.8-1.9z'/%3E%3Cpath opacity='.65' fill='%23161616' d='M300.1 40.1c-14.4-4.4-29.2-7.6-44.1-9.5-9.7-1.3-19.5-2-29.3-2.3v-1.8c9.8.2 19.7 1 29.5 2.3 15 2 29.9 5.2 44.4 9.6l-.5 1.7z'/%3E%3Cg opacity='.5' fill='%23EBEBEB'%3E%3Cpath d='M198.9 36.2c5.8 0 8.9 2.5 8.9 3.5s-3.1 3.5-8.9 3.5-8.9-2.5-8.9-3.5 3.2-3.5 8.9-3.5m0-3.6c-6.9 0-12.5 3.2-12.5 7.1s5.6 7.1 12.5 7.1 12.5-3.2 12.5-7.1-5.5-7.1-12.5-7.1z'/%3E%3Cpath d='M213.5 41.5h-29.2c-.9 0-1.6-.7-1.6-1.6 0-.9.7-1.6 1.6-1.6h29.2c.9 0 1.6.7 1.6 1.6 0 .9-.7 1.6-1.6 1.6z'/%3E%3C/g%3E%3ClinearGradient id='b' gradientUnits='userSpaceOnUse' x1='1511.313' y1='93.019' x2='1511.313' y2='73.665' gradientTransform='matrix(-1 0 0 1 1695.542 0)'%3E%3Cstop offset='0' stop-color='%234f4f4f'/%3E%3Cstop offset='1' stop-color='%23b8b8b8'/%3E%3C/linearGradient%3E%3Cpath fill='url(%23b)' d='M198.9 92.2l-23.4.8c-2.6.1-4.8-1.7-5.2-4.3l-.7-4.5 29.3-10.6v18.6z'/%3E%3Cpath opacity='.5' fill='%23EBEBEB' d='M198.9.1c-35.1-.7-77.8 5.5-87.3 11.1-4.7 2.8-8.3 6-11.2 8.6-2.3 2.1-3.4 5.2-2.9 8.2l1.3 8.3c13.1-6 31.2-12.6 53.5-16.1 18.1-2.9 34-2.9 46.5-2.1 12.6-.8 28.5-.8 46.5 2.1 22.3 3.5 40.4 10.2 53.5 16.1l1.3-8.3c.5-3.1-.6-6.1-2.9-8.2-2.9-2.6-6.7-5.5-11.2-8.6-7.2-5-49.4-11.9-87.1-11.1z'/%3E%3Cpath opacity='.65' fill='%23161616' d='M70.1 622l-3.6-.4C73.6 555.8 80 489 85.6 423c7.7-91 13.9-181.4 18.6-268.7l3.6.2c-4.6 87.3-10.9 177.8-18.6 268.8-5.6 66-12 132.8-19.1 198.7zM97.6 40.1l-.5-1.7c14.5-4.4 29.4-7.6 44.4-9.6 9.7-1.3 19.6-2 29.5-2.3v1.8c-9.8.2-19.6 1-29.3 2.3-14.8 1.9-29.7 5.1-44.1 9.5z'/%3E%3Cpath opacity='.65' fill='%23161616' d='M279.2 156.3H118.5c-10.8 0-21.3-1.9-31.3-5.8l-6.3-2.4.7-1.7 6.3 2.4c9.8 3.8 20.2 5.7 30.7 5.7h160.8c10.5 0 20.9-1.9 30.7-5.7l6.3-2.4.7 1.7-6.3 2.4c-10.3 3.8-20.8 5.8-31.6 5.8zM198.9 14.7c-10.3 0-26 5.5-27.9 10.4-.4 1-.8 2.9 0 5.7h55.8c.8-2.8.4-4.7 0-5.7-1.9-4.9-17.6-10.4-27.9-10.4z'/%3E%3ClinearGradient id='c' gradientUnits='userSpaceOnUse' x1='198.86' y1='836.542' x2='198.86' y2='815.224'%3E%3Cstop offset='0' stop-color='%234f4f4f'/%3E%3Cstop offset='1' stop-color='%23b8b8b8'/%3E%3C/linearGradient%3E%3Cpath opacity='.5' fill='url(%23c)' d='M198.8 816.4l-36.9-1.2c-2.6-.1-4.1 3-2.4 5 1.1 2.4 4.1 7.8 10.3 11.8 7.4 4.8 26.5 4.6 29 4.5 2.5.2 21.6.3 29-4.5 6.3-4 9.2-9.4 10.3-11.8 1.7-2 .3-5.1-2.4-5l-36.9 1.2'/%3E%3Cpath fill='%23161616' d='M198.8 721.4c-18.8 0-106.8-9.7-126.3-64.1-3.5-9.7-7-19.4-7-41.6 0-17.2 12.5-93.8 16.7-119.6 24.9 22.8 116.6 24.3 116.6 24.3s91.7-1.5 116.6-24.3c4.2 25.9 16.7 102.5 16.7 119.6 0 22.2-3.5 31.9-7 41.6-19.5 54.3-107.4 64.1-126.3 64.1'/%3E%3ClinearGradient id='d' gradientUnits='userSpaceOnUse' x1='278.145' y1='805.778' x2='353.531' y2='675.206'%3E%3Cstop offset='0' stop-color='%234f4f4f'/%3E%3Cstop offset='1'/%3E%3C/linearGradient%3E%3Cpath fill='url(%23d)' d='M336.3 665.5c2.2.3 5.2 3.6 7.3 19.1 1.6 10.2 4.8 39.9-11.4 72-15.9 31.5-40.9 46.5-50.1 51.5 5.5-16.9 13.2-40.7 22.8-69.2 18-54 25.4-74.2 31.4-73.4z'/%3E%3ClinearGradient id='e' gradientUnits='userSpaceOnUse' x1='452.813' y1='512.957' x2='217.939' y2='278.084'%3E%3Cstop offset='0' stop-color='%234f4f4f'/%3E%3Cstop offset='1' stop-color='%23293e4f'/%3E%3C/linearGradient%3E%3Cpath fill='url(%23e)' d='M347.4 618.4c-6.8-31.5-15.1-76.5-20.3-131.2-2-21.1-4.4-51.8-5.5-127.2-.7-47.2-.8-110.7 1.2-186.7 5.7 3.9 12.9 10.3 16.4 20 2.1 6 1.9 11 2.1 12.4 8.2 53.5 10.9 106.4 10.3 159.7-.7 61.9-1.5 140.7-3.9 234.1l-.3 18.9z'/%3E%3Cpath fill='%23474747' d='M200.4 695.9c-.6-1.2-2.4-1.2-3 0-1.3 2.7-2.7 6.7-2.8 11.7-.1 5.5 1.5 9.9 2.8 12.7.6 1.2 2.4 1.2 3 0 1.4-2.8 2.9-7.2 2.8-12.7-.1-5-1.5-9-2.8-11.7zM237.2 694.9c-.4-1.1-1.9-1.1-2.5-.1-1.2 2.2-2.6 5.4-2.9 9.6-.4 4.5.7 8.3 1.7 10.7.4 1.1 1.9 1.1 2.5.1 1.3-2.3 2.8-5.9 3-10.4.2-4.2-.8-7.6-1.8-9.9zM276.9 686.5c-.2-.9-1.3-1.1-1.9-.4-1.2 1.5-2.6 3.9-3.3 7.1-.8 3.5-.3 6.5.2 8.4.2.9 1.3 1.1 1.9.4 1.2-1.6 2.8-4.2 3.4-7.7.6-3.2.2-5.9-.3-7.8z'/%3E%3ClinearGradient id='f' gradientUnits='userSpaceOnUse' x1='213.513' y1='93.019' x2='213.513' y2='73.665'%3E%3Cstop offset='0' stop-color='%234f4f4f'/%3E%3Cstop offset='1' stop-color='%23b8b8b8'/%3E%3C/linearGradient%3E%3Cpath fill='url(%23f)' d='M198.9 92.2l23.4.8c2.6.1 4.8-1.7 5.2-4.3l.7-4.5-29.3-10.6v18.6z'/%3E%3ClinearGradient id='g' gradientUnits='userSpaceOnUse' x1='1496.671' y1='131.651' x2='1496.671' y2='55.901' gradientTransform='matrix(-1 0 0 1 1695.542 0)'%3E%3Cstop offset='0' stop-color='%234f4f4f'/%3E%3Cstop offset='1'/%3E%3C/linearGradient%3E%3Cpath fill='url(%23g)' d='M198.9 82.5c-58.7-.2-98.8 37.3-108.8 48.1-1.3 1.5-3.7 1.2-4.8-.4-4.9-7.7-7.3-16.6-8.3-21.8-.6-2.8.4-5.7 2.5-7.6 29.5-27.2 92.4-44.9 119.4-44.9s89.9 17.8 119.4 44.9c2.1 1.9 3 4.8 2.5 7.6-1 5.2-3.4 14.1-8.3 21.8-1.1 1.7-3.4 1.9-4.8.4-10.1-10.8-50.1-48.2-108.8-48.1z'/%3E%3ClinearGradient id='h' gradientUnits='userSpaceOnUse' x1='1396.357' y1='88.659' x2='1596.986' y2='88.659' gradientTransform='matrix(-1 0 0 1 1695.542 0)'%3E%3Cstop offset='0' stop-color='%234f4f4f'/%3E%3Cstop offset='1' stop-color='%23b8b8b8'/%3E%3C/linearGradient%3E%3Cpath fill='url(%23h)' d='M198.9 80.9C143.4 80.6 105 115 105 115l-3.4-4.6c-5.7-7.8-3.3-18.8 5-23.6 15.6-8.9 29.5-13.8 39-17 6.2-2.1 14-4.5 23.3-6.8 4.4-1 8.9-.7 13.1.9 6.1 2.4 16.8 2.4 16.8 2.4s10.7 0 16.8-2.4c4.2-1.6 8.7-1.9 13.1-.9 9.3 2.2 17.1 4.7 23.3 6.8 9.6 3.3 23.4 8.1 39 17 8.4 4.8 10.7 15.8 5 23.6l-3 4.1c.1 0-39.7-33.7-94.1-33.6z'/%3E%3ClinearGradient id='i' gradientUnits='userSpaceOnUse' x1='298.469' y1='86.549' x2='339.328' y2='86.549'%3E%3Cstop offset='0' stop-color='%234f4f4f'/%3E%3Cstop offset='1' stop-color='%23b8b8b8'/%3E%3C/linearGradient%3E%3Cpath fill='url(%23i)' d='M316.9 148.7c.6 1.2 2.2 1.4 3 .3 10.2-13.2 14.6-25.5 16.6-33.1 8.6-32.7-2.9-64.7-19.1-82.1-2.5-2.7-11.6-12.5-16.2-10.1-3.6 1.9-2.6 10.4-2.2 13.4 4.5 5.9 10.5 15 15.5 27.1 4.6 11.2 9.4 23 8 38.1-.5 5.5-3.4 15.5-11.4 27.5-1.1 1.6-1.3 3.7-.4 5.5l6.2 13.4z'/%3E%3Cpath fill='%23F21919' d='M320.4 146l.7 2.6c.2.8 1.4 1 1.8.2l17.3-37.6c.1-.2.1-.4 0-.6l-.7-2.6c-.2-.8-1.4-1-1.8-.2l-17.3 37.6c-.1.2-.1.4 0 .6z'/%3E%3Cpath fill='%23D3D3D3' d='M319.5 77.6l10-8.1c-2.8-7.8-6.8-17.2-12.9-27.2-5.5-9-11-12.5-16.2-18.2-.6.5-4.6 3.9-4.6 9 0 2.9 1.2 5.8 3.3 8 5.6 5.9 10.4 12.6 13.6 20.1l6.8 16.4z'/%3E%3ClinearGradient id='j' gradientUnits='userSpaceOnUse' x1='1389.247' y1='678.652' x2='1498.562' y2='489.313' gradientTransform='matrix(-1 0 0 1 1641.173 0)'%3E%3Cstop offset='0' stop-color='%234f4f4f'/%3E%3Cstop offset='1' stop-color='%23293e4f'/%3E%3C/linearGradient%3E%3Cpath fill='url(%23j)' d='M198.9 531s-70.3-3.6-98.7-13.1c-6.2-2.1-12.8 2-13.7 8.5l-12.1 87.4c-2.1 15.4 6.8 30.2 21.5 35.3 31.7 10.9 85.5 13.1 103.1 12 17.6 1.1 71.4-1.1 103.1-12 14.7-5 23.6-19.9 21.5-35.3l-12.1-87.4c-.9-6.5-7.5-10.5-13.7-8.5-28.6 9.4-98.9 13.1-98.9 13.1'/%3E%3Cpath fill='%23474747' d='M198.9 693.3c-24.9 0-90.2-10.9-103.4-29.8 0 0 64.8 16.1 103.4 16.6 37.1-.7 103.4-16.6 103.4-16.6-13.2 18.8-78.5 29.8-103.4 29.8zM160.5 694.9c.4-1.1 1.9-1.1 2.5-.1 1.2 2.2 2.6 5.4 2.9 9.6.4 4.5-.7 8.3-1.7 10.7-.4 1.1-1.9 1.1-2.5.1-1.3-2.3-2.8-5.9-3-10.4-.2-4.2.8-7.6 1.8-9.9zM120.8 686.5c.2-.9 1.3-1.1 1.9-.4 1.2 1.5 2.6 3.9 3.3 7.1.8 3.5.3 6.5-.2 8.4-.2.9-1.3 1.1-1.9.4-1.2-1.6-2.8-4.2-3.4-7.7-.6-3.2-.2-5.9.3-7.8z'/%3E%3ClinearGradient id='k' gradientUnits='userSpaceOnUse' x1='1568.425' y1='805.778' x2='1643.811' y2='675.206' gradientTransform='matrix(-1 0 0 1 1688 0)'%3E%3Cstop offset='0' stop-color='%234f4f4f'/%3E%3Cstop offset='1'/%3E%3C/linearGradient%3E%3Cpath fill='url(%23k)' d='M61.4 665.5c-2.2.3-5.2 3.6-7.3 19.1-1.6 10.2-4.8 39.9 11.4 72 15.9 31.5 40.9 46.5 50.1 51.5-5.5-16.9-13.2-40.7-22.8-69.2-18-54-25.4-74.2-31.4-73.4z'/%3E%3ClinearGradient id='l' gradientUnits='userSpaceOnUse' x1='1743.093' y1='512.957' x2='1508.22' y2='278.084' gradientTransform='matrix(-1 0 0 1 1688 0)'%3E%3Cstop offset='0' stop-color='%234f4f4f'/%3E%3Cstop offset='1' stop-color='%23293e4f'/%3E%3C/linearGradient%3E%3Cpath fill='url(%23l)' d='M50.4 618.4c6.8-31.5 15.1-76.5 20.3-131.2 2-21.1 4.4-51.8 5.5-127.2.7-47.2.8-110.7-1.2-186.7-5.7 3.9-12.9 10.3-16.4 20-2.1 6-1.9 11-2.1 12.4-8.2 53.5-10.9 106.4-10.3 159.7.7 61.9 1.5 140.7 3.9 234.1l.3 18.9z'/%3E%3ClinearGradient id='m' gradientUnits='userSpaceOnUse' x1='1588.749' y1='86.549' x2='1629.608' y2='86.549' gradientTransform='matrix(-1 0 0 1 1688 0)'%3E%3Cstop offset='0' stop-color='%234f4f4f'/%3E%3Cstop offset='1' stop-color='%23b8b8b8'/%3E%3C/linearGradient%3E%3Cpath fill='url(%23m)' d='M80.9 148.7c-.6 1.2-2.2 1.4-3 .3-10.2-13.2-14.6-25.5-16.6-33.1-8.6-32.7 2.9-64.7 19.1-82.1 2.5-2.7 11.6-12.5 16.2-10.1 3.6 1.9 2.6 10.4 2.2 13.4-4.5 5.9-10.5 15-15.5 27.1-4.6 11.2-9.4 23-8 38.1.5 5.5 3.4 15.5 11.4 27.5 1.1 1.6 1.3 3.7.4 5.5l-6.2 13.4z'/%3E%3Cpath fill='%23F21919' d='M77.4 146l-.7 2.6c-.2.8-1.4 1-1.8.2l-17.3-37.6c-.1-.2-.1-.4 0-.6l.7-2.6c.2-.8 1.4-1 1.8-.2l17.3 37.6v.6z'/%3E%3Cpath fill='%23D3D3D3' d='M78.3 77.6l-10-8.1c2.8-7.8 6.8-17.2 12.9-27.2 5.5-9 11-12.5 16.2-18.2.6.5 4.6 3.9 4.6 9 0 2.9-1.2 5.8-3.3 8C93 47.2 88.2 53.9 85 61.4l-6.7 16.2z'/%3E%3Cpath fill='%23161616' d='M359.5 543.8c-1.3 0-2.5-.8-3-2.1-.6-1.7.2-3.5 1.9-4.1l31-11.5c1.6-.6 3.5.2 4.1 1.9.6 1.7-.2 3.5-1.9 4.1l-31 11.5c-.3.2-.7.2-1.1.2zM38.7 543.8c1.3 0 2.5-.8 3-2.1.6-1.7-.2-3.5-1.9-4.1l-31-11.5c-1.6-.6-3.5.2-4.1 1.9s.2 3.5 1.9 4.1l31 11.5c.4.2.8.2 1.1.2z'/%3E%3Cg opacity='.5' fill='%23EBEBEB'%3E%3Cpath d='M198.9 822.4c5.8 0 8.9 2.5 8.9 3.5s-3.1 3.5-8.9 3.5-8.9-2.5-8.9-3.5 3.2-3.5 8.9-3.5m0-3.6c-6.9 0-12.5 3.2-12.5 7.1s5.6 7.1 12.5 7.1 12.5-3.2 12.5-7.1-5.5-7.1-12.5-7.1z'/%3E%3Cpath d='M213.5 827.6h-29.2c-.9 0-1.6-.7-1.6-1.6 0-.9.7-1.6 1.6-1.6h29.2c.9 0 1.6.7 1.6 1.6 0 .9-.7 1.6-1.6 1.6z'/%3E%3C/g%3E%3Cpath fill='%23FFF' d='M207.1 369.8h-14.6c-2.9 0-5.3-2.4-5.3-5.3v-70.4c0-2.9 2.4-5.3 5.3-5.3h14.6c2.9 0 5.3 2.4 5.3 5.3v70.4c0 2.9-2.4 5.3-5.3 5.3z'/%3E%3ClinearGradient id='n' gradientUnits='userSpaceOnUse' x1='199.75' y1='301.317' x2='199.75' y2='342.529'%3E%3Cstop offset='0' stop-color='%2319a160'/%3E%3Cstop offset='.229' stop-color='%2317965a'/%3E%3Cstop offset='.629' stop-color='%23137948'/%3E%3Cstop offset='1' stop-color='%230e5935'/%3E%3C/linearGradient%3E%3Cpath fill='url(%23n)' d='M208.7 307.9c-.6-1.7-2.8-6.6-8.9-6.6s-8.3 4.9-8.9 6.6c-.6 1.7-1.1 4.8-.8 7.6.7 7.8 9.7 27 9.7 27s9-19.1 9.7-27c.2-2.8-.2-5.8-.8-7.6z'/%3E%3C/svg%3E")`;
      this.vehicleMarker = new mapboxgl.Marker(el);
      this.vehicleMarker.setLngLat(new mapboxgl.LngLat(longitude, latitude));
      this.vehicleMarker.addTo(this.map);
    } else {
      let position = this.vehicleMarker.getLngLat();

      if (position) {
        let lng = position.lng;
        let lat = position.lat;
        this.vehicleMarker.setLngLat(new mapboxgl.LngLat(longitude, latitude));
        this.updateMarkerDirection(lng, lat, longitude, latitude);
      }
    }
  }
}
