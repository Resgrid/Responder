import { NgModule } from '@angular/core';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ShiftsRoutingModule } from './shifts-routing.module';
import { reducer } from './reducers/shifts.reducer';
import { ShiftsEffects } from './effects/shifts.effect';
import { IonicModule } from '@ionic/angular';
import { HammerModule } from '@angular/platform-browser';
import { NgxResgridLibModule } from '@resgrid/ngx-resgridlib';
import { TranslateModule } from '@ngx-translate/core';
import { ShellModule } from 'src/app/shell/shell.module';
import { ComponentsModule } from 'src/app/components/components.module';
import { ShiftDetailPage } from './pages/shift-detail/shift-detail.page';
import { CalendarModule } from 'angular-calendar';
import { ShiftDayPage } from './pages/shift-day/shift-day.page';

@NgModule({
    declarations: [
        ShiftDetailPage,
        ShiftDayPage
    ],
    imports: [
        IonicModule,
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        ShiftsRoutingModule,
        StoreModule.forFeature('shiftsModule', reducer),
        EffectsModule.forFeature([ShiftsEffects]),
        HammerModule,
        NgxResgridLibModule,
        TranslateModule,
        ShellModule,
        TranslateModule,
        ComponentsModule,
        CalendarModule,
    ],
    providers: [],
    exports: [
        ShiftDetailPage,
        ShiftDayPage
    ]
})
export class ShiftsModule { }
