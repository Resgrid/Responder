import { NgModule } from '@angular/core';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CalendarRoutingModule } from './calendar-routing.module';
import { reducer } from './reducers/calendar.reducer';
import { CalendarEffects } from './effects/calendar.effect';
import { IonicModule } from '@ionic/angular';
import { HammerModule } from '@angular/platform-browser';
import { NgxResgridLibModule } from '@resgrid/ngx-resgridlib';
import { TranslateModule } from '@ngx-translate/core';
import { ShellModule } from 'src/app/shell/shell.module';
import { CalendarDetailPage } from './pages/calendar-detail/calendar-detail.page';
import { ComponentsModule } from 'src/app/components/components.module';

@NgModule({
    declarations: [
        CalendarDetailPage
    ],
    imports: [
        IonicModule,
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        CalendarRoutingModule,
        StoreModule.forFeature('calendarModule', reducer),
        EffectsModule.forFeature([CalendarEffects]),
        HammerModule,
        NgxResgridLibModule,
        TranslateModule,
        ShellModule,
        TranslateModule,
        ComponentsModule,
    ],
    providers: [],
    exports: [
        CalendarDetailPage
    ]
})
export class CalendarModule { }
