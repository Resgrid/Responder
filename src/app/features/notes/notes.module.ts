import { NgModule } from '@angular/core';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { NotesRoutingModule } from './notes-routing.module';
import { reducer } from './reducers/notes.reducer';
import { IonicModule } from '@ionic/angular';
import { HammerModule } from '@angular/platform-browser';
import { NgxResgridLibModule } from '@resgrid/ngx-resgridlib';
import { TranslateModule } from '@ngx-translate/core';
import { ShellModule } from 'src/app/shell/shell.module';
import { NotesEffects } from './effects/notes.effect';
import { NewNotePage } from './pages/new-note/new-note.page';

@NgModule({
    declarations: [
        NewNotePage
    ],
    imports: [
        IonicModule,
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        NotesRoutingModule,
        StoreModule.forFeature('notesModule', reducer),
        EffectsModule.forFeature([NotesEffects]),
        HammerModule,
        NgxResgridLibModule,
        TranslateModule,
        ShellModule
    ],
    providers: [],
    exports: [
        NewNotePage
    ]
})
export class NotesModule { }
