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
    loadChildren: () => import('./pages/protocols/protocols.module').then(m => m.ProtocolsModule)
  },
  {
    path: 'view',
    loadChildren: () => import('./pages/view-protocol/view-protocol.module').then(m => m.ViewProtocolModule)
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProtocolsRoutingModule {}
