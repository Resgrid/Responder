import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CallCardComponent } from './call-card/call-card.component';
import { NgxResgridLibModule } from '@resgrid/ngx-resgridlib';
import { CTAPanelComponent } from './cta-panel/cta-panel';
import { VoiceModule } from '../features/voice/voice.module';
import { AppHeaderComponent } from './app-header/app-header';
import { ActionsListComponent } from './actionsList/action-lists.component';
import { StaffingListComponent } from './staffingList/staffing-lists.component';
import { PersonCardComponent } from './person-card/person-card.component';
import { UnitCardComponent } from './units-card/units-card.component';
import { ProtocolCardComponent } from './protocol-card/protocol-card.component';
import { NoteCardComponent } from './note-card/note-card.component';

@NgModule({
    imports: [
        IonicModule,
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        NgxResgridLibModule,
        VoiceModule
    ],
    declarations: [
        CallCardComponent,
        CTAPanelComponent,
        AppHeaderComponent,
        ActionsListComponent,
        StaffingListComponent,
        PersonCardComponent,
        UnitCardComponent,
        ProtocolCardComponent,
        NoteCardComponent
    ],
    exports: [
        CallCardComponent,
        CTAPanelComponent,
        AppHeaderComponent,
        ActionsListComponent,
        StaffingListComponent,
        PersonCardComponent,
        UnitCardComponent,
        ProtocolCardComponent,
        NoteCardComponent
    ]
})
export class ComponentsModule {}
