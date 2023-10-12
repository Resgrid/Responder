import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UnitsPage } from './units.page';
import { HomeModule } from '../../home.module';
import { NgxResgridLibModule } from '@resgrid/ngx-resgridlib';
import { ComponentsModule } from 'src/app/components/components.module';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    RouterModule.forChild([
      {
        path: '',
        component: UnitsPage
      }
    ]),
    NgxResgridLibModule,
    ComponentsModule,
    TranslateModule
  ],
  declarations: [UnitsPage]
})
export class UnitsPageModule {}
