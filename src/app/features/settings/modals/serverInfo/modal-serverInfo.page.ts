import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { SettingsState } from '../../store/settings.store';
import * as SettingsActions from '../../actions/settings.actions';
import { urlValidator } from 'src/app/validators/url.validators';
import { StorageProvider } from 'src/app/providers/storage';

@Component({
  selector: 'app-modal-serverInfo',
  templateUrl: './modal-serverInfo.page.html',
  styleUrls: ['./modal-serverInfo.page.scss'],
})
export class ModalServerInfoPage implements OnInit {
  serverForm: FormGroup;

  constructor(
    private modal: ModalController,
    private formBuilder: FormBuilder,
    private store: Store<SettingsState>,
    private storageService: StorageProvider
  ) {
    
  }

  ngOnInit() {
    this.serverForm = this.formBuilder.group({
      serverAddress: ['https://api.resgrid.com', [Validators.required, urlValidator]],
    });

    this.storageService.getServerAddress().then(serverAddress => { 
      if (serverAddress && serverAddress.trim() !== '' && serverAddress.trim() !== 'undefined' && serverAddress.trim() !== 'null') {
        this.serverForm.controls['serverAddress'].setValue(serverAddress.trim());
        this.serverForm.controls['serverAddress'].patchValue(serverAddress.trim());
      }
    });
  }

  dismissModal() {
    this.modal.dismiss();
  }

  save() {
    if (this.serverForm.valid) {
      this.store.dispatch(
        new SettingsActions.SetServerAddress(this.f.serverAddress.value.trim())
      );
      localStorage.setItem('CapacitorStorage.serverAddress', this.f.serverAddress.value.trim());
    } else {
      console.log('invalid');
    }
  }

  get f() {
    return this.serverForm.controls;
  }
}
