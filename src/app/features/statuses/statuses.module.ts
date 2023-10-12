import { NgModule } from '@angular/core';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { StatusesRoutingModule } from './statuses-routing.module';
import { reducer } from './reducers/statuses.reducer';
import { StatusesEffects } from './effects/statuses.effect';
//import { LeafletModule } from '@asymmetrik/ngx-leaflet';
import { IonicModule } from '@ionic/angular';
import { ModalSetStatusDestinationPage } from './modals/setStatusDestination/modal-setStatusDestination.page';
import { ModalSetStatusNotePage } from './modals/setStatusNote/modal-setStatusNote.page';
import { ModalSetStaffingNotePage } from './modals/setStaffingNote/modal-setStaffingNote.page';

@NgModule({
    declarations: [
        ModalSetStatusDestinationPage,
        ModalSetStatusNotePage,
        ModalSetStaffingNotePage
    ],
    imports: [
        IonicModule,
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        StatusesRoutingModule,
        StoreModule.forFeature('statusesModule', reducer),
        EffectsModule.forFeature([StatusesEffects])
    ],
    providers: [],
    exports: [
        ModalSetStatusDestinationPage,
        ModalSetStatusNotePage,
        ModalSetStaffingNotePage
    ]
})
export class StatusesModule { }
