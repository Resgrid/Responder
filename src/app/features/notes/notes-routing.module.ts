import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full'
  },
  {
    path: 'list',
    loadChildren: () => import('./pages/notes-list/notes-list.module').then(m => m.NotesListModule)
  },
  {
    path: 'view',
    loadChildren: () => import('./pages/view-note/view-note.module').then(m => m.ViewNoteModule)
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class NotesRoutingModule {}
