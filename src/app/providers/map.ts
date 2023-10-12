import { Injectable, Inject } from '@angular/core';
import { MapMakerInfoData, MappingService } from '@resgrid/ngx-resgridlib';
import { GeoLocation } from '../models/geoLocation';
import mapboxgl from 'mapbox-gl';
import { take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class MapProvider {
  public coordinates = [];

  constructor(private mappingService: MappingService) {}

  public setImages(mapElement: any) {
    if (mapElement) {
      mapElement.loadImage('assets/mapping/Call.png', (error, image) => {
        if (error) throw error;
        mapElement.addImage('Call-marker', image);
      });

      mapElement.loadImage(
        'assets/mapping/Engine_Available.png',
        (error, image) => {
          if (error) throw error;
          mapElement.addImage('Engine_Available-marker', image);
        }
      );

      mapElement.loadImage(
        'assets/mapping/Engine_Responding.png',
        (error, image) => {
          if (error) throw error;
          mapElement.addImage('Engine_Responding-marker', image);
        }
      );

      mapElement.loadImage('assets/mapping/Event.png', (error, image) => {
        if (error) throw error;
        mapElement.addImage('Event-marker', image);
      });

      mapElement.loadImage('assets/mapping/Helipad.png', (error, image) => {
        if (error) throw error;
        mapElement.addImage('Helipad-marker', image);
      });

      mapElement.loadImage(
        'assets/mapping/Person_Available.png',
        (error, image) => {
          if (error) throw error;
          mapElement.addImage('Person_Available-marker', image);
        }
      );

      mapElement.loadImage(
        'assets/mapping/Person_OnScene.png',
        (error, image) => {
          if (error) throw error;
          mapElement.addImage('Person_OnScene-marker', image);
        }
      );

      mapElement.loadImage(
        'assets/mapping/Person_RespondingCall.png',
        (error, image) => {
          if (error) throw error;
          mapElement.addImage('Person_RespondingCall-marker', image);
        }
      );

      mapElement.loadImage(
        'assets/mapping/Person_RespondingStation.png',
        (error, image) => {
          if (error) throw error;
          mapElement.addImage('Person_RespondingStation-marker', image);
        }
      );

      mapElement.loadImage('assets/mapping/Person.png', (error, image) => {
        if (error) throw error;
        mapElement.addImage('Person-marker', image);
      });

      mapElement.loadImage(
        'assets/mapping/Rescue_Available.png',
        (error, image) => {
          if (error) throw error;
          mapElement.addImage('Rescue_Available-marker', image);
        }
      );

      mapElement.loadImage(
        'assets/mapping/Rescue_Responding.png',
        (error, image) => {
          if (error) throw error;
          mapElement.addImage('Rescue_Responding-marker', image);
        }
      );

      mapElement.loadImage('assets/mapping/Station.png', (error, image) => {
        if (error) throw error;
        mapElement.addImage('Station-marker', image);
      });

      mapElement.loadImage('assets/mapping/WaterSupply.png', (error, image) => {
        if (error) throw error;
        mapElement.addImage('WaterSupply-marker', image);
      });
    }
  }

  public setMarkersForMap(
    mapElement: any,
    position: GeoLocation,
    userMovedMap: boolean
  ): void {
    if (mapElement) {
      this.mappingService.getMapDataAndMarkers().pipe(take(1)).subscribe(
        (data: any) => {
          if (data && data.Data && data.Data.MapMakerInfos) {
            this.coordinates = [];

            const places = {
              type: 'FeatureCollection',
              features: [],
            };

            data.Data.MapMakerInfos.forEach((markerInfo: MapMakerInfoData) => {
              const feature = {
                type: 'Feature',
                properties: {
                  description: `${markerInfo.Title}`,
                  icon: `${markerInfo.ImagePath}-marker`,
                },
                geometry: {
                  type: 'Point',
                  coordinates: [markerInfo.Longitude, markerInfo.Latitude],
                },
              };

              this.coordinates.push(feature.geometry.coordinates);

              places.features.push(feature);
            });

            try {
              let mpLayer = mapElement.getLayer('poi-labels');

              //if (mapElement.isSourceLoaded('places') === true) {
              if (typeof mpLayer != 'undefined') {
                mapElement.removeLayer('poi-labels');
                mapElement.removeSource('places');
              }
            } catch (error) {}

            mapElement.addSource('places', {
              type: 'geojson',
              data: places,
            });

            mapElement.addLayer({
              id: 'poi-labels',
              type: 'symbol',
              source: 'places',
              layout: {
                'text-field': ['get', 'description'],
                'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
                'text-radial-offset': 0.5,
                'text-justify': 'auto',
                'icon-image': ['get', 'icon'],
              },
            });

            if (!userMovedMap) {
              if (!position) {
                let bounds = this.coordinates.reduce(function (bounds, coord) {
                  return bounds.extend(coord);
                }, new mapboxgl.LngLatBounds(
                  this.coordinates[0],
                  this.coordinates[1]
                ));

                mapElement.fitBounds(bounds, {
                  padding: 40,
                });
              } else {
                mapElement.jumpTo({
                  center: new mapboxgl.LngLat(
                    position.Longitude,
                    position.Latitude
                  ),
                  essential: true,
                });
                mapElement.setZoom(13);
              }
            }
          }
        },
        (err: any) => {}
      );
    }
  }
}
