import { isPlatformServer } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID, makeStateKey, TransferState } from '@angular/core';

import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

export enum ImageShellState {
  SSR = 'ssr-loaded',
  BROWSER_FROM_SSR = 'browser-loaded-from-ssr',
  NOT_FOUND = 'not-found'
}

@Injectable({
  providedIn: 'root'
})
export class TransferStateHelper {

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private state: TransferState,
  ) { }

  // Method with generic param
  checkDataSourceState<T>(stateKey: string, dataSource: Observable<T>): Observable<T> {
    const dataKey = makeStateKey<T>(stateKey);

    if (isPlatformServer(this.platformId)) {
      // When loading resource in the server, store the result in the TransferState
      // to use when transitioning to the browser from the SSR rendered app
      return dataSource.pipe(
        tap(
          (data: T) => {
            this.state.set(dataKey, data);
          }
        )
      );
    } else {
      // Check if we have data in the TransferState
      if (this.state.hasKey(dataKey)) {
        const stateData = this.state.get(dataKey, null);

        if (stateData && stateData !== null) {
          const cachedDataSource = of(stateData);

          // After using it, remove data from state
          // this.state.remove(dataKey);

          // Set a flag to track if the dataSource is being cached in the server state or not
          Object.assign(cachedDataSource, {ssr_state: true});

          return cachedDataSource;
        } else {
          return dataSource;
        }
      } else {
        return dataSource;
      }
    }
  }

  // This method checks if a specific image was previously handled in the server
  checkImageShellState(stateKey: string, imageSource: string): ImageShellState {
    let imageState: ImageShellState = ImageShellState.NOT_FOUND;

    // Make sure we are not dealing with empty image sources
    if (imageSource !== '') {
      // We will store a collection of image sources in the state
      const dataKey = makeStateKey<Array<string>>(stateKey);

      if (isPlatformServer(this.platformId)) {
        // When loading resource in the server, store the result in the TransferState
        // to use when transitioning to the browser from the SSR rendered app

        const stateImages = this.state.get(dataKey, []);
        stateImages.push(imageSource);

        this.state.set(dataKey, stateImages);

        // Running in the server, in this execution the image is set in the transfer state for the first time
        imageState = ImageShellState.SSR;
      } else {
        // Check if we have data in the TransferState
        if (this.state.hasKey(dataKey)) {
          const stateData = this.state.get(dataKey, []);

          // Check if the image was previously loaded in the server
          if (stateData.includes(imageSource)) {
            imageState = ImageShellState.BROWSER_FROM_SSR;
          }
        }
      }
    }

    return imageState;
  }
}
