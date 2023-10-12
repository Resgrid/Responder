import { NgModule } from '@angular/core';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { UnitsRoutingModule } from './units-routing.module';
import { reducer } from './reducers/units.reducer';
import { UnitsEffects } from './effects/unit.effect';
import { IonicModule } from '@ionic/angular';
import { HammerModule } from '@angular/platform-browser';
import { NgxResgridLibModule } from '@resgrid/ngx-resgridlib';
import { TranslateModule } from '@ngx-translate/core';
import { ShellModule } from 'src/app/shell/shell.module';
import { ViewUnitPage } from './pages/view-unit/view-unit.page';
import { FilterUnitsPage } from './pages/filter-units/filter-units.page';

@NgModule({
    declarations: [
        FilterUnitsPage,
        ViewUnitPage
    ],
    imports: [
        IonicModule,
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        UnitsRoutingModule,
        StoreModule.forFeature('unitsModule', reducer),
        EffectsModule.forFeature([UnitsEffects]),
        HammerModule,
        NgxResgridLibModule,
        TranslateModule,
        ShellModule
    ],
    providers: [],
    exports: [
        FilterUnitsPage,
        ViewUnitPage
    ]
})
export class UnitsModule { }
