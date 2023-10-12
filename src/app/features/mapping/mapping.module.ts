import { NgModule } from '@angular/core';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MappingRoutingModule } from './mapping-routing.module';
import { reducer } from './reducers/mapping.reducer';
import { MappingEffects } from './effects/mapping.effect';
import { IonicModule } from '@ionic/angular';
import { HammerModule } from '@angular/platform-browser';
import { NgxResgridLibModule } from '@resgrid/ngx-resgridlib';
import { TranslateModule } from '@ngx-translate/core';
import { ShellModule } from 'src/app/shell/shell.module';
import { MapPage } from './pages/map/map.page';

@NgModule({
    declarations: [
    ],
    imports: [
        IonicModule,
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MappingRoutingModule,
        StoreModule.forFeature('mappingModule', reducer),
        EffectsModule.forFeature([MappingEffects]),
        HammerModule,
        NgxResgridLibModule,
        TranslateModule,
        ShellModule
    ],
    providers: [],
    exports: [
    ]
})
export class MappingModule { }
