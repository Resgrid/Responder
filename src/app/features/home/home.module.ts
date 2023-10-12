import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { reducer } from './reducers/home.reducer';
import { EffectsModule } from '@ngrx/effects';
import { HomeEffects } from './effects/home.effects';
import { StoreModule } from '@ngrx/store';
import { HomeRoutingModule } from './home-routing.module';
import { NgxResgridLibModule } from '@resgrid/ngx-resgridlib';
import { ModalCallPush } from './modals/callPush/modal-callPush.page';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
    imports: [
        IonicModule,
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        StoreModule.forFeature('homeModule', reducer),
        EffectsModule.forFeature([HomeEffects]),
        HomeRoutingModule,
        NgxResgridLibModule,
        TranslateModule
    ],
    declarations: [ModalCallPush]
})
export class HomeModule {}
