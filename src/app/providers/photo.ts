import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Storage } from '@capacitor/storage';
import { Platform } from '@ionic/angular';


@Injectable({
    providedIn: 'root',
  })
  export class PhotoService {
    public photos: UserPhoto[] = [];
    private PHOTO_STORAGE: string = 'photos';
  
    constructor(private platform: Platform) {}
  
    /* Use the device camera to take a photo:
    // https://capacitor.ionicframework.com/docs/apis/camera
    // Store the photo data into permanent file storage:
    // https://capacitor.ionicframework.com/docs/apis/filesystem
    // Store a reference to all photo filepaths using Storage API:
    // https://capacitor.ionicframework.com/docs/apis/storage
    */
    public async getPhoto() {
      // Take a photo
      const capturedPhoto = await Camera.getPhoto({
        resultType: CameraResultType.Uri, // file-based data; provides best performance
        source: CameraSource.Prompt,
        quality: 100, // highest quality (0 to 100)
      });
  
      const base64Data = await this.readAsBase64(capturedPhoto);
  
      return base64Data;
    }
  
    // Read camera photo into base64 format based on the platform the app is running on
    private async readAsBase64(cameraPhoto: Photo) {
      // "hybrid" will detect Cordova or Capacitor
      if (this.platform.is('hybrid')) {
        // Read the file into base64 format
        const file = await Filesystem.readFile({
          path: cameraPhoto.path,
        });
  
        return file.data;
      } else {
        // Fetch the photo, read as a blob, then convert to base64 format
        const response = await fetch(cameraPhoto.webPath!);
        const blob = await response.blob();
  
        return (await this.convertBlobToBase64(blob)) as string;
      }
    }
  
    convertBlobToBase64 = (blob: Blob) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = () => {
          resolve(reader.result);
        };
        reader.readAsDataURL(blob);
      });
  }
  
  export interface UserPhoto {
    filepath: string;
    webviewPath: string;
  }