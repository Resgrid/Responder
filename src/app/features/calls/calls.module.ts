import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { reducer } from './reducers/calls.reducer';
import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';
import { CallsRoutingModule } from './calls-routing.module';
import { VoiceModule } from '../voice/voice.module';
import { CallsEffects } from './effects/calls.effect';
import { HomeModule } from '../home/home.module';
import { ModalViewCallPage } from './pages/view-call/view-call.page';
import { NgxResgridLibModule } from '@resgrid/ngx-resgridlib';
import { PerfectScrollbarModule } from 'ngx-perfect-scrollbar';
import { GalleryModule } from  'ng-gallery';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ComponentsModule } from 'src/app/components/components.module';
import { TranslateModule } from '@ngx-translate/core';
import { NewCallPage } from './pages/new-call/new-call.page';
import { SelectLocationPage } from './pages/select-location/select-location.page';
import { SelectDispatchesPage } from './pages/select-dispatches/select-dispatches.page';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { CloseCallPage } from './pages/close-call/close-call.page';
import { EditCallPage } from './pages/edit-call/edit-call.page';
import { SelectDispatchesEditPage } from './pages/select-dispatches-edit/select-dispatches-edit.page';
import { ModalCallNotesPage } from './modals/notes-modal/modal-notes.page';

@NgModule({
    imports: [
        IonicModule,
        CommonModule,
        FormsModule,
        BrowserAnimationsModule,
        ReactiveFormsModule,
        StoreModule.forFeature('callsModule', reducer),
        EffectsModule.forFeature([CallsEffects]),
        CallsRoutingModule,
        NgxResgridLibModule,
        PerfectScrollbarModule,
        GalleryModule,
        ComponentsModule,
        TranslateModule,
        ScrollingModule
    ],
    declarations: [
        ModalViewCallPage,
        NewCallPage,
        SelectLocationPage,
        SelectDispatchesPage,
        CloseCallPage,
        EditCallPage,
        SelectDispatchesEditPage,
        ModalCallNotesPage
    ]
})
export class CallsModule {}
