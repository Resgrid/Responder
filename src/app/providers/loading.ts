import { Injectable } from '@angular/core';
import { LoadingController } from '@ionic/angular';
import { typePropertyIsNotAllowedInProps } from '@ngrx/store/src/models';

@Injectable({
	providedIn: 'root',
})
export class LoadingProvider {
	private spinner: HTMLIonLoadingElement;

	constructor(private loadingCtrl: LoadingController) {}

	// Show loading
	public async show() {
		this.spinner = await this.loadingCtrl.create({
			//cssClass: 'my-custom-class',
			message: 'Please wait...',
		});
		await this.spinner.present();
	}

	// Hide loading
	public async hide() {
		//console.log('hide spinner');
		try {
			let topLoader = await this.loadingCtrl.getTop();
			while (topLoader) {
				if (!(await topLoader.dismiss())) {
					throw new Error('Could not dismiss the topmost loader. Aborting...');
				}
				topLoader = await this.loadingCtrl.getTop();
			}

			this.spinner = null;
		} catch (e) {}

		//if (await this.loadingCtrl.getTop()) {
		//	await this.loadingCtrl.dismiss();
		//	this.spinner = null;
		//}
	}
}
