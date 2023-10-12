import { NgModule } from '@angular/core';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { PersonnelRoutingModule } from './personnel-routing.module';
import { reducer } from './reducers/personnel.reducer';
import { PersonnelEffects } from './effects/personnel.effect';
import { IonicModule } from '@ionic/angular';
import { HammerModule } from '@angular/platform-browser';
import { FilterPersonnelPage } from './pages/filter-personnel/filter-personnel.page';
import { NgxResgridLibModule } from '@resgrid/ngx-resgridlib';
import { TranslateModule } from '@ngx-translate/core';
import { ViewPersonPage } from './pages/view-person/view-person.page';
import { ShellModule } from 'src/app/shell/shell.module';

@NgModule({
    declarations: [
        FilterPersonnelPage,
        ViewPersonPage
    ],
    imports: [
        IonicModule,
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        PersonnelRoutingModule,
        StoreModule.forFeature('personnelModule', reducer),
        EffectsModule.forFeature([PersonnelEffects]),
        HammerModule,
        NgxResgridLibModule,
        TranslateModule,
        ShellModule
    ],
    providers: [],
    exports: [
        FilterPersonnelPage,
        ViewPersonPage
    ]
})
export class PersonnelModule { }
