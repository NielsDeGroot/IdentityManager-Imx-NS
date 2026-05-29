/*
 * ONE IDENTITY LLC. PROPRIETARY INFORMATION
 *
 * This software is confidential.  One Identity, LLC. or one of its affiliates or
 * subsidiaries, has supplied this software to you under terms of a
 * license agreement, nondisclosure agreement or both.
 *
 * You may not copy, disclose, or use this software except in accordance with
 * those terms.
 *
 *
 * Copyright 2023 One Identity LLC.
 * ALL RIGHTS RESERVED.
 *
 * ONE IDENTITY LLC. MAKES NO REPRESENTATIONS OR
 * WARRANTIES ABOUT THE SUITABILITY OF THE SOFTWARE,
 * EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
 * TO THE IMPLIED WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE, OR
 * NON-INFRINGEMENT.  ONE IDENTITY LLC. SHALL NOT BE
 * LIABLE FOR ANY DAMAGES SUFFERED BY LICENSEE
 * AS A RESULT OF USING, MODIFYING OR DISTRIBUTING
 * THIS SOFTWARE OR ITS DERIVATIVES.
 *
 */

import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { EuiCoreModule, EuiMaterialModule } from '@elemental-ui/core';
import { TranslateModule } from '@ngx-translate/core';

import {
  CdrModule,
  ClassloggerService,
  ConfirmationModule,
  DataSourceToolbarModule,
  DataTableModule,
  LdsReplaceModule,
  MultiSelectFormcontrolModule,
  UserMessageModule,
  RouteGuardService,
  BusyIndicatorModule,
  MenuItem,
  MenuService,
} from 'qbm';
import { ReportSelectorComponent } from './subscription-wizard/report-selector/report-selector.component';
import { ReportSubscriptionService } from './report-subscription/report-subscription.service';
import { SubscriptionDetailsComponent } from './subscription-details/subscription-details.component';
import { SubscriptionOverviewComponent } from './subscription-wizard/subscription-overview/subscription-overview.component';
import { SubscriptionPropertiesComponent } from './subscription-properties/subscription-properties.component';
import { SubscriptionsComponent } from './subscriptions.component';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionWizardComponent } from './subscription-wizard/subscription-wizard.component';
import { ReportViewConfigComponent } from './report-view-config/report-view-config.component';
import { ListReportViewerModule } from '../list-report-viewer/list-report-viewer.module';
import { HttpClientModule } from '@angular/common/http';
import { OverlayModule } from '@angular/cdk/overlay';
import { ListReportViewerSidesheetComponent } from './list-report-viewer-sidesheet/list-report-viewer-sidesheet.component';


const routes: Routes = [
  {
    path: 'reportsubscriptions',
    component: SubscriptionsComponent,
    canActivate: [RouteGuardService],
    resolve: [RouteGuardService]
  }
];

@NgModule({
  declarations: [
    ReportSelectorComponent,
    ReportViewConfigComponent,
    SubscriptionDetailsComponent,
    SubscriptionPropertiesComponent,
    SubscriptionOverviewComponent,
    SubscriptionWizardComponent,
    SubscriptionsComponent,
    ListReportViewerSidesheetComponent,
  ],
  imports: [
    CdrModule,
    CommonModule,
    ConfirmationModule,
    DataSourceToolbarModule,
    DataTableModule,
    EuiCoreModule,
    EuiMaterialModule,
    FormsModule,
    HttpClientModule,
    LdsReplaceModule,
    MultiSelectFormcontrolModule,
    OverlayModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    ScrollingModule,
    TranslateModule,
    UserMessageModule,
    BusyIndicatorModule,
    ListReportViewerModule,
  ],
  providers: [ReportSubscriptionService, SubscriptionsService],
})
/* NS20262916 Move Report subscriptions from Profile to Menu Bar */
export class SubscriptionsModule {  constructor(private readonly menuService: MenuService, logger: ClassloggerService) {
    logger.info(this, '▶️ Subscriptions Module loaded');
    this.setupMenu();
  }

  private setupMenu(): void {
    this.menuService.addMenuFactories((preProps: string[], features: string[]) => {
      const items: MenuItem[] = [];

      items.push({
        id: 'RPS_ReportSubscriptions',
        navigationCommands: {
          commands: ['reportsubscriptions']
        },
        title: '#LDS#Heading Report Subscriptions',
        sorting: '55-10',
      });


      if (items.length === 0) {
        return null;
      }
      return {
        id: 'ROOT_Reports',
        title: '#LDS#Menu Entry Reports',
        sorting: '55',
        items,
      };
    });
  }
}
