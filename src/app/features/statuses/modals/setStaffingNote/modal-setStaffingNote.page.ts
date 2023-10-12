import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { HomeState } from 'src/app/features/home/store/home.store';
import { Observable } from 'rxjs';
import { selectHomeState, selectStatusesState } from 'src/app/store';
import {
  CallResultData,
  StatusesResultData,
  UnitResultData,
} from '@resgrid/ngx-resgridlib';
import { take } from 'rxjs/operators';
import * as _ from 'lodash';
import { StatusesState } from '../../store/statuses.store';
import * as StatusesActions from '../../actions/statuses.actions';
import * as HomeActions from '../../../home/actions/home.actions';

@Component({
  selector: 'app-modal-setStaffingNote',
  templateUrl: './modal-setStaffingNote.page.html',
  styleUrls: ['./modal-setStaffingNote.page.scss'],
})
export class ModalSetStaffingNotePage implements OnInit {
  public status: StatusesResultData;
  public noteForm: FormGroup;
  public statusesState$: Observable<StatusesState | null>;

  constructor(
    private modal: ModalController,
    private statusesStore: Store<StatusesState>,
    public formBuilder: FormBuilder
  ) {
    this.statusesState$ = this.statusesStore.select(selectStatusesState);
  }

  ngOnInit() {
    this.statusesState$.subscribe((state) => {
      if (state && state.submittingPersonStatus) {
        this.status = state.submittingPersonStatus;
      }
    });

    this.noteForm = this.formBuilder.group({
      callNote: [''],
    });
  }

  get form() {
    return this.noteForm.controls;
  }

  dismissModal() {
    this.modal.dismiss();
  }

  public canSubmit(): boolean {
    if (this.status) {
      const callForm = this.form;
      const callNote = callForm['callNote'].value;

      if (this.status.Note === 3 && (!callNote || callNote.length === 0)) {
        return false;
      }
    }

    return true;
  }

  setNote() {
    if (this.canSubmit()) {
      const callForm = this.form;
      const callNote = callForm['callNote'].value;

      this.statusesStore
        .select(selectStatusesState)
        .pipe(take(1))
        .subscribe((state) => {
          if (state.pendingSetPersonStaffing) {

            let staffing = _.cloneDeep(state.pendingSetPersonStaffing);
            staffing.note = callNote;

            this.statusesStore.dispatch(new StatusesActions.SubmitPersonStaffingNoteSet(staffing, callNote));
          }
        });
    }
  }
}
