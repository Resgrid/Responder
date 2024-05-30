import { Injectable } from '@angular/core';
import { IStorageProvider, UtilsService } from '@resgrid/ngx-resgridlib';
import { StartupData } from '../features/settings/models/startupData';
import { LoginResult } from '../models/loginResult';
import { Preferences } from '@capacitor/preferences';

@Injectable({
  providedIn: 'root',
})
export class ModuleStorageProvider implements IStorageProvider {
  public async read(key: string): Promise<string> {
    const { value } = await Preferences?.get({ key: key });

    return value;
  }

  public async write(key: string, value: string): Promise<void> {
    return await Preferences?.set({
      key: key,
      value: value,
    });
  }

  public async remove(key: string): Promise<void> {
    return await Preferences?.remove({key: key});
  }

  public async clear(): Promise<any> {
    return await Preferences?.clear();
  }
}
