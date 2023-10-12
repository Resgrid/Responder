import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { WalkthroughPage } from './walkthrough.page';
import { TranslateModule } from '@ngx-translate/core';
import { ShellModule } from 'src/app/shell/shell.module';
import { register } from 'swiper/element/bundle';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

register();

@NgModule({
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ReactiveFormsModule,
    RouterModule.forChild([
      {
        path: '',
        component: WalkthroughPage
      }
    ]),
    TranslateModule,
        ShellModule
  ],
  declarations: [WalkthroughPage]
})
export class WalkthroughPageModule {}
