import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ViewProtocolPage } from './view-protocol.page';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NgxResgridLibModule } from '@resgrid/ngx-resgridlib';
import { HammerModule } from '@angular/platform-browser';
import { ShellModule } from 'src/app/shell/shell.module';
import { ComponentsModule } from 'src/app/components/components.module';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    RouterModule.forChild([
      {
        path: '',
        component: ViewProtocolPage
      }
    ]),
    TranslateModule,
    HammerModule,
    NgxResgridLibModule,
    ShellModule,
    ComponentsModule
  ],
  declarations: [ViewProtocolPage]
})
export class ViewProtocolModule {}
