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

import { Injectable } from '@angular/core';

import { ProjectConfig, QerProjectConfig } from 'imx-api-qer';
import { CachedPromise } from 'imx-qbm-dbts';
import { CacheService, ClassloggerService, SettingsService } from 'qbm';
import { QerApiService } from '../qer-api-client.service';

/**
 * ProjectConfigurationService returns the configuration of the portal.
 * The configuration contains among other things information which fields of the returned object types are visible to a user.
 */
@Injectable({
  providedIn: 'root'
})
export class ProjectConfigurationService {
  private readonly projectConfigCache: CachedPromise<QerProjectConfig & ProjectConfig>;

  constructor(private qerClient: QerApiService,
    private readonly settings: SettingsService,
    private readonly logger: ClassloggerService,
    cacheService: CacheService) {
    this.projectConfigCache = cacheService.buildCache(() => this.fetchConfig());
  }

  public async getConfig(): Promise<QerProjectConfig & ProjectConfig> {
    const projectConfig = await this.projectConfigCache.get();
    this.settings.DefaultPageSize = projectConfig.DefaultPageSize;
    return projectConfig;
  }

  private async fetchConfig(): Promise<QerProjectConfig & ProjectConfig> {
    this.logger.info(this, 'Fetching project configuration...');
    const [qerProjectConfig, projectConfig] = await Promise.all([
      this.qerClient.client.portal_qer_projectconfig_get(),
      this.qerClient.client.portal_config_get()
    ]);
    const merged = { ...qerProjectConfig, ...projectConfig };
    this.logger.info(this, 'Received project configuration.');
    this.logger.trace(this, '', merged);
    return merged;
  }

}
