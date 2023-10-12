import { NgModule } from '@angular/core';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { VoiceRoutingModule } from './voice-routing.module';
import { reducer } from './reducers/voice.reducer';
import { VoiceEffects } from './effects/voice.effect';
//import { LeafletModule } from '@asymmetrik/ngx-leaflet';
import { VoiceFooterComponent } from './shared/voice-header/voice-header.component';
import { IonicModule } from '@ionic/angular';
import { HammerModule, HAMMER_GESTURE_CONFIG } from '@angular/platform-browser';
import { IonicGestureConfig } from 'src/app/config/gesture.config';
import { VgCoreModule } from '@videogular/ngx-videogular/core';
import { VgControlsModule } from '@videogular/ngx-videogular/controls';
import { VgOverlayPlayModule } from '@videogular/ngx-videogular/overlay-play';
import { VgBufferingModule } from '@videogular/ngx-videogular/buffering';
import { ModalAudioStreams } from './modal/audio-streams/modal-audioStreams.page';
import { TranslateModule } from '@ngx-translate/core';
import { VgModuloModule } from '@videogular/ngx-videogular/modulo';

@NgModule({
    declarations: [
        VoiceFooterComponent,
        ModalAudioStreams
    ],
    imports: [
        IonicModule,
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        VoiceRoutingModule,
        //LeafletModule,
        StoreModule.forFeature('voiceModule', reducer),
        EffectsModule.forFeature([VoiceEffects]),
        HammerModule,
        VgCoreModule,
        VgControlsModule,
        VgOverlayPlayModule,
        VgBufferingModule,
        VgModuloModule,
        TranslateModule
    ],
    providers: [],
    exports: [
        VoiceFooterComponent,
        ModalAudioStreams
    ]
})
export class VoiceModule { }
