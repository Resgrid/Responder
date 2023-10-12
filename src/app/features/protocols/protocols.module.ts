import { NgModule } from '@angular/core';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ProtocolsRoutingModule } from './protocols-routing.module';
import { reducer } from './reducers/protocols.reducer';
import { ProtocolsEffects } from './effects/protocols.effect';
import { IonicModule } from '@ionic/angular';
import { HammerModule } from '@angular/platform-browser';
import { NgxResgridLibModule } from '@resgrid/ngx-resgridlib';
import { TranslateModule } from '@ngx-translate/core';
import { ShellModule } from 'src/app/shell/shell.module';

@NgModule({
    declarations: [
    ],
    imports: [
        IonicModule,
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        ProtocolsRoutingModule,
        StoreModule.forFeature('protocolsModule', reducer),
        EffectsModule.forFeature([ProtocolsEffects]),
        HammerModule,
        NgxResgridLibModule,
        TranslateModule,
        ShellModule
    ],
    providers: [],
    exports: [
    ]
})
export class ProtocolsModule { }
