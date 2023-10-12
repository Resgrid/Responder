import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import {
  DeviceService,
  GetConfigResultData,
  SaveUnitLocationInput,
  UnitLocationService,
} from '@resgrid/ngx-resgridlib';
import { StorageProvider } from './storage';
import { registerPlugin } from '@capacitor/core';
import { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation';
import { Store } from '@ngrx/store';
import { HomeState } from '../features/home/store/home.store';
import { Geolocation, Position } from '@capacitor/geolocation';
import { GeoLocation } from '../models/geoLocation';
const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>(
  'BackgroundGeolocation'
);
import * as HomeActions from '../features/home/actions/home.actions';
import {
  ConnectableObservable,
  Observable,
  bindCallback,
  map,
  of,
  publishReplay,
  switchMap,
  take,
  throwError,
} from 'rxjs';
import { selectConfigData } from '../store';
import { HttpClient } from '@angular/common/http';

declare var OpenLocationCode: any;

@Injectable({
  providedIn: 'root',
})
export class GeolocationProvider {
  isRegistering: boolean = false;
  watchPositionId: string = null;
  backgroundWatcherId: string = null;
  private w3wKey: string = '';

  private configData$: Observable<GetConfigResultData | null>;
  protected geocoder$: Observable<google.maps.Geocoder>;

  constructor(
    private loader: LazyGoogleMapsLoader,
    private platform: Platform,
    private storageProvider: StorageProvider,
    private deviceService: DeviceService,
    private unitLocationService: UnitLocationService,
    private store: Store<HomeState>,
    private http: HttpClient
  ) {
    this.configData$ = this.store.select(selectConfigData);

    this.configData$.subscribe((configData) => {
      if (configData && configData.GoogleMapsKey && !this.geocoder$) {
        this.w3wKey = configData.W3WKey;

        const connectableGeocoder$ = new Observable((subscriber) => {
          loader.load(configData.GoogleMapsKey).then(() => subscriber.next());
        }).pipe(
          map(() => this._createGeocoder()),
          publishReplay(1)
        ) as ConnectableObservable<google.maps.Geocoder>;

        connectableGeocoder$.connect(); // ignore the subscription
        // since we will remain subscribed till application exits

        this.geocoder$ = connectableGeocoder$;
      }
    });
  }

  private _createGeocoder() {
    return new google.maps.Geocoder();
  }

  private _getGoogleResults(
    geocoder: google.maps.Geocoder,
    request: google.maps.GeocoderRequest
  ): Observable<google.maps.GeocoderResult[]> {
    const geocodeObservable = bindCallback(geocoder.geocode);
    return geocodeObservable(request).pipe(
      switchMap(([results, status]) => {
        if (status === google.maps.GeocoderStatus.OK) {
          return of(results);
        }

        return throwError(status);
      })
    );
  }

  private geocode(
    request: google.maps.GeocoderRequest
  ): Observable<google.maps.GeocoderResult[]> {
    return this.geocoder$.pipe(
      switchMap((geocoder) => this._getGoogleResults(geocoder, request))
    );
  }

  public async getLocation(): Promise<GeoLocation> {
    let position: Position = null;

    try {
      position = await Geolocation.getCurrentPosition();
    } catch (err) {
      console.log(err);
    }

    if (
      position &&
      position.coords.latitude != 0 &&
      position.coords.longitude &&
      position.coords.longitude != 0
    ) {
      return new GeoLocation(
        position.coords.latitude,
        position.coords.longitude
      );
    }

    return null;
  }

  public async startTracking() {
    if (!this.watchPositionId) {
      this.watchPositionId = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 10000,
        },
        (position, err) => {
          if (position) {
            let location = new GeoLocation(
              position.coords.latitude,
              position.coords.longitude
            );
            location.Accuracy = position.coords.accuracy;
            location.Altitude = position.coords.altitude;
            location.AltitudeAccuracy = position.coords.altitudeAccuracy;
            location.Heading = position.coords.heading;
            location.Speed = position.coords.speed;

            this.store.dispatch(
              new HomeActions.GeolocationLocationUpdate(location)
            );
          }
        }
      );
    }
  }

  public async stopTracking() {
    if (this.watchPositionId) {
      await Geolocation.clearWatch({ id: this.watchPositionId });
      this.watchPositionId = null;
    }
  }

  public async initBackgroundGeolocation(): Promise<void> {
    const that = this;

    if (this.platform.is('mobile')) {
      let enableBackgroundGeolocation =
        await this.storageProvider.getEnableBackgroundGeolocation();
      let unitId = await that.storageProvider.getActiveUnit();

      if (unitId && enableBackgroundGeolocation) {
        this.backgroundWatcherId = await BackgroundGeolocation.addWatcher(
          {
            // If the "backgroundMessage" option is defined, the watcher will
            // provide location updates whether the app is in the background or the
            // foreground. If it is not defined, location updates are only
            // guaranteed in the foreground. This is true on both platforms.

            // On Android, a notification must be shown to continue receiving
            // location updates in the background. This option specifies the text of
            // that notification.
            backgroundMessage:
              'Cancel to prevent battery drain and stop tracking.',

            // The title of the notification mentioned above. Defaults to "Using
            // your location".
            backgroundTitle: 'Resgrid Unit is using your location.',

            // Whether permissions should be requested from the user automatically,
            // if they are not already granted. Defaults to "true".
            requestPermissions: true,

            // If "true", stale locations may be delivered while the device
            // obtains a GPS fix. You are responsible for checking the "time"
            // property. If "false", locations are guaranteed to be up to date.
            // Defaults to "false".
            stale: false,

            // The minimum number of meter's between subsequent locations. Defaults
            // to 0.
            distanceFilter: 20,
          },
          function callback(location, error) {
            if (error) {
              if (error.code === 'NOT_AUTHORIZED') {
                if (
                  window.confirm(
                    'This app needs your location, ' +
                      'but does not have permission.\n\n' +
                      'Open settings now?'
                  )
                ) {
                  // It can be useful to direct the user to their device's
                  // settings when location permissions have been denied. The
                  // plugin provides the 'openSettings' method to do exactly
                  // this.
                  BackgroundGeolocation.openSettings();
                }
              }
              return console.error(error);
            }

            if (location) {
              let date = new Date();

              let input = new SaveUnitLocationInput();
              input.UnitId = unitId;
              input.Timestamp = date.toUTCString().replace('UTC', 'GMT');
              input.Latitude = location.latitude.toString();
              input.Longitude = location.longitude.toString();

              if (location.accuracy) {
                input.Accuracy = location.accuracy.toString();
              }

              if (location.altitude) {
                input.Altitude = location.altitude.toString();
              }

              if (location.altitudeAccuracy) {
                input.AltitudeAccuracy = location.altitudeAccuracy.toString();
              }

              if (location.speed) {
                input.Speed = location.speed.toString();
              }

              if (location.bearing) {
                input.Heading = location.bearing.toString();
              }

              that.unitLocationService
                .saveUnitLocation(input)
                .subscribe((data) => {
                  if (data) {
                  }
                });
            }
          }
        );
      }
    }
  }

  public async stopBackgroundGeolocation(): Promise<void> {
    if (this.backgroundWatcherId) {
      await BackgroundGeolocation.removeWatcher({
        id: this.backgroundWatcherId,
      });
      this.backgroundWatcherId = null;
    }
  }

  public getLocationFromAddress(address: string) {
    return this.geocode({ address: address }).pipe(
      map((data) => {
        if (data && data.length > 0) {
          return new GeoLocation(
            data[0].geometry.location.lat(),
            data[0].geometry.location.lng()
          );
        }

        return null;
      })
    );
  }

  public getCoordinatesFromW3W(w3w: string): Observable<GeoLocation> {
    return this.http
      .get(
        `https://api.what3words.com/v3/convert-to-coordinates?words=${w3w}&key=${this.w3wKey}`
      )
      .pipe(
        map((data: any) => {
          if (data && data.coordinates) {
            return new GeoLocation(data.coordinates.lat, data.coordinates.lng);
          }

          return null;
        })
      );
  }

  public getCoordinatesFromPlusCode(plusCode: string): Observable<GeoLocation> {
    return new Observable((observer) => {
      try {
        const decoded =  OpenLocationCode.decode(plusCode);
        observer.next(new GeoLocation(decoded.latitudeCenter, decoded.longitudeCenter));
        observer.complete();
      } catch (error) {
        observer.error(error);
      }
    })
  }
}

@Injectable({
  providedIn: 'root',
})
export class LazyGoogleMapsLoader {
  protected _scriptLoadingPromise: any;
  protected readonly _SCRIPT_ID: string = 'googleMapsApiScript';
  protected readonly callbackName: string = `lazyMapsAPILoader`;

  constructor() {}

  load(googleMapsKey: string): Promise<void> {
    //const window = this._windowRef.nativeWindow() as any;
    if (window.google && window.google.maps) {
      // Google maps already loaded on the page.
      return Promise.resolve();
    }

    if (this._scriptLoadingPromise) {
      return this._scriptLoadingPromise;
    }

    // this can happen in HMR situations or Stackblitz.io editors.
    const scriptOnPage = document.getElementById(this._SCRIPT_ID);
    if (scriptOnPage) {
      this._assignScriptLoadingPromise(scriptOnPage);
      return this._scriptLoadingPromise;
    }

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.defer = true;
    script.id = this._SCRIPT_ID;
    script.src = this._getScriptSrc(this.callbackName, googleMapsKey);
    this._assignScriptLoadingPromise(script);
    document.body.appendChild(script);
    return this._scriptLoadingPromise;
  }

  private _assignScriptLoadingPromise(scriptElem: HTMLElement) {
    this._scriptLoadingPromise = new Promise((resolve, reject) => {
      window[this.callbackName] = () => {
        resolve(true);
      };

      scriptElem.onerror = (error: any) => {
        reject(error);
      };
    });
  }

  protected _getScriptSrc(callbackName: string, googleMapsKey: string): string {
    const hostAndPath: string = 'maps.googleapis.com/maps/api/js';
    const queryParams: { [key: string]: string | string[] } = {
      v: 'quarterly',
      callback: callbackName,
      key: googleMapsKey,
      //client: this._config.clientId,
      //channel: this._config.channel,
      //libraries: this._config.libraries,
      //region: this._config.region,
      language: 'en-US',
    };
    const params: string = Object.keys(queryParams)
      .filter((k: string) => queryParams[k] != null)
      .filter((k: string) => {
        // remove empty arrays
        return (
          !Array.isArray(queryParams[k]) ||
          (Array.isArray(queryParams[k]) && queryParams[k].length > 0)
        );
      })
      .map((k: string) => {
        // join arrays as comma separated strings
        const i = queryParams[k];
        if (Array.isArray(i)) {
          return { key: k, value: i.join(',') };
        }
        return { key: k, value: queryParams[k] };
      })
      .map((entry: { key: string; value: string | string[] }) => {
        return `${entry.key}=${entry.value}`;
      })
      .join('&');
    return `https://${hostAndPath}?${params}`;
  }
}
