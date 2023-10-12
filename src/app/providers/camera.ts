import { Injectable } from '@angular/core';
import { AlertController, Platform, ToastController } from '@ionic/angular';
import {
  Camera,
  CameraResultType,
  CameraSource,
  Photo,
} from '@capacitor/camera';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { encode } from 'base64-arraybuffer';

@Injectable({
  providedIn: 'root',
})
export class CameraProvider {
  constructor(private toastCtrl: ToastController, private platform: Platform) {}

  public async getImage(): Promise<Photo> {
    const result = await Camera.requestPermissions({
      permissions: ['camera', 'photos'],
    });

    if (result &&
      (result.camera === 'granted' || result.photos === 'granted')) {
      const image = await Camera.getPhoto({
        quality: 50,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Prompt,
      });

      return image;
    } else {
      const toast = await this.toastCtrl.create({
        message:
          'Resgrid Unit does not have permission to access Camera or Photos.',
        duration: 3000,
        position: 'top',
      });
      toast.present();
    }
  }

  public async readAsBase64(photo: Photo) {
    if (this.platform.is('hybrid')) {
      const file = await Filesystem.readFile({
        path: photo.path
      });

      //debugger;
      return file.data;
    } else {
      // Fetch the photo, read as a blob, then convert to base64 format
      const response = await fetch(photo.webPath);
      const blob = await response.blob();

      return (await this.convertBlobToBase64(blob)) as string;
    }
  }

  // Helper function
  convertBlobToBase64 = (blob: Blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const { result } = reader;
        const data = result as ArrayBuffer;
        resolve(encode(data));
      };
      reader.readAsArrayBuffer(blob);
    });
}
