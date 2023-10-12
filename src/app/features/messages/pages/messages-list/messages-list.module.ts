import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessagesListPage } from './messages-list.page';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NgxResgridLibModule } from '@resgrid/ngx-resgridlib';
import { HammerModule } from '@angular/platform-browser';
import { ShellModule } from 'src/app/shell/shell.module';
import { ComponentsModule } from 'src/app/components/components.module';
import { CalendarModule, DateAdapter } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    RouterModule.forChild([
      {
        path: '',
        component: MessagesListPage
      }
    ]),
    TranslateModule,
    HammerModule,
    NgxResgridLibModule,
    ShellModule,
    ComponentsModule,
    CalendarModule.forRoot({
      provide: DateAdapter,
      useFactory: adapterFactory,
    }),
  ],
  declarations: [MessagesListPage]
})
export class MessagesListModule {}
