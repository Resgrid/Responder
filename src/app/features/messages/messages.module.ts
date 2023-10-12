import { NgModule } from '@angular/core';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MessagesRoutingModule } from './messages-routing.module';
import { reducer } from './reducers/messages.reducer';
import { MessagesEffects } from './effects/messages.effect';
import { IonicModule } from '@ionic/angular';
import { HammerModule } from '@angular/platform-browser';
import { NgxResgridLibModule } from '@resgrid/ngx-resgridlib';
import { TranslateModule } from '@ngx-translate/core';
import { ShellModule } from 'src/app/shell/shell.module';
import { ComponentsModule } from 'src/app/components/components.module';
import { CalendarModule } from 'angular-calendar';
import { ViewMessagePage } from './pages/view-message/view-message.page';
import { NewMessagePage } from './pages/new-message/new-message.page';
import { SelectRecipientsPage } from './pages/select-recipients/select-recipients.page';

@NgModule({
    declarations: [
        ViewMessagePage,
        NewMessagePage,
        SelectRecipientsPage
    ],
    imports: [
        IonicModule,
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MessagesRoutingModule,
        StoreModule.forFeature('messagesModule', reducer),
        EffectsModule.forFeature([MessagesEffects]),
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
        ViewMessagePage,
        NewMessagePage,
        SelectRecipientsPage
    ]
})
export class MessagesModule { }
