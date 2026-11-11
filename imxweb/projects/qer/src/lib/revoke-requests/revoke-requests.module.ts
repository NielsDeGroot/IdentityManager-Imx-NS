/*
 * Dedicated Revoke Requests feature module for One Identity Manager 9.2.1.
 */

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import {
  ClassloggerService,
  MenuItem,
  MenuService,
  RouteGuardService,
} from 'qbm';

import { RequestHistoryModule } from '../request-history/request-history.module';
import { RequestsFeatureGuardService } from '../requests-feature-guard.service';
import { RevokeRequestsComponent } from './revoke-requests.component';

const routes: Routes = [
  {
    path: 'revokerequests',
    component: RevokeRequestsComponent,
    canActivate: [RouteGuardService, RequestsFeatureGuardService],
    resolve: [RouteGuardService],
  },
];

@NgModule({
  imports: [
    CommonModule,
    RequestHistoryModule,
    RouterModule.forChild(routes),
    TranslateModule,
  ],
  declarations: [RevokeRequestsComponent],
})
export class RevokeRequestsModule {
  constructor(
    private readonly menuService: MenuService,
    logger: ClassloggerService,
  ) {
    logger.info(this, 'RevokeRequestsModule loaded');
    this.setupMenu();
  }

  private setupMenu(): void {
    this.menuService.addMenuFactories((preProps: string[], features: string[]) => {
      const items: MenuItem[] = [];

      if (preProps.includes('ITSHOP')) {
        items.push({
          id: 'CCC_Request_RevokeRequests',
          route: 'revokerequests',
          title: '#LDS#Revoke requests',
          sorting: '10-35',
        });
      }

      if (items.length === 0) {
        return null;
      }

      return {
        id: 'ROOT_Request',
        title: '#LDS#Requests',
        sorting: '10',
        items,
      };
    });
  }
}
