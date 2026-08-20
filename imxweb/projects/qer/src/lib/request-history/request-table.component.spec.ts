import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { of, Subject } from 'rxjs';

import { DataSourceToolbarFilter, ExtService, imx_SessionService, SettingsService } from 'qbm';
import { ProjectConfigurationService } from '../project-configuration/project-configuration.service';
import { ViewConfigService } from '../view-config/view-config.service';
import { RequestActionService } from './request-action/request-action.service';
import { RequestHistoryService } from './request-history.service';
import { RequestTableComponent } from './request-table.component';

describe('RequestTableComponent', () => {
  function createComponent(routeQueryParams = {}, snapshotParams: Record<string, string> = {}) {
    const settingsService = { DefaultPageSize: 20 } as SettingsService;
    const actionService = { applied: new Subject<void>() } as unknown as RequestActionService;
    const translator = { get: jasmine.createSpy('get').and.returnValue(of('#LDS#Badges')) } as unknown as TranslateService;
    const sideSheet = {
      open: jasmine.createSpy('open').and.returnValue({
        afterClosed: () => ({
          toPromise: () => Promise.resolve(),
        }),
      }),
    };
    const requestHistoryService = {
      PortalItshopRequestsSchema: {
        Columns: {
          DisplayOrg: { ColumnName: 'DisplayOrg' },
          UiOrderState: { ColumnName: 'UiOrderState' },
          OrderDate: { ColumnName: 'OrderDate' },
        },
      },
      getDataModel: jasmine.createSpy('getDataModel').and.returnValue(Promise.resolve({})),
      getFilterOptions: jasmine.createSpy('getFilterOptions').and.returnValue(Promise.resolve([] as DataSourceToolbarFilter[])),
      getRequests: jasmine.createSpy('getRequests').and.returnValue(Promise.resolve({ totalCount: 0, Data: [] })),
      getRequest: jasmine.createSpy('getRequest'),
      exportRequests: jasmine.createSpy('exportRequests').and.returnValue({}),
    } as unknown as RequestHistoryService;
    const viewConfigService = {
      getInitialDSTExtension: jasmine.createSpy('getInitialDSTExtension').and.returnValue(Promise.resolve({})),
      isDefaultConfigSet: jasmine.createSpy('isDefaultConfigSet').and.returnValue(false),
    } as unknown as ViewConfigService;
    const session = {
      getSessionState: jasmine.createSpy('getSessionState').and.returnValue(Promise.resolve({ UserUid: 'uid-user' })),
    } as unknown as imx_SessionService;
    const projectConfig = {
      getConfig: jasmine.createSpy('getConfig').and.callFake(() => {
        settingsService.DefaultPageSize = 1000;
        return Promise.resolve({ ITShopConfig: {} });
      }),
    } as unknown as ProjectConfigurationService;
    const activatedRoute = {
      queryParams: of(routeQueryParams),
      snapshot: {
        queryParamMap: {
          get: (key: string) => snapshotParams[key],
        },
      },
    } as unknown as ActivatedRoute;
    const ext = { Registry: {} } as ExtService;

    const component = new RequestTableComponent(
      actionService,
      undefined,
      translator,
      sideSheet as any,
      requestHistoryService,
      viewConfigService,
      session,
      settingsService,
      projectConfig,
      activatedRoute,
      ext
    );

    return { component, requestHistoryService, sideSheet };
  }

  it('uses the configured page size for the first request history data load', async () => {
    const { component, requestHistoryService } = createComponent();

    await component.ngOnInit();

    expect(requestHistoryService.getRequests).not.toHaveBeenCalled();
    expect(component.dstSettings.navigationState).toEqual(jasmine.objectContaining({ PageSize: 1000 }));

    await component.getData();

    expect(requestHistoryService.getRequests).toHaveBeenCalledWith('uid-user', jasmine.objectContaining({ PageSize: 1000 }));
  });

  it('preserves route filters when refreshing the configured page size', async () => {
    const { component, requestHistoryService } = createComponent(
      { uid_personwantsorg: 'uid-pwo' },
      { ShowEndingSoon: '1', ShowMyPending: '1' }
    );

    await component.ngOnInit();

    expect(requestHistoryService.getRequests).not.toHaveBeenCalled();
    expect(component.dstSettings.navigationState).toEqual(
      jasmine.objectContaining({
        PageSize: 1000,
        uidpwo: 'uid-pwo',
        ShowEndingSoon: '1',
        ShowMyPending: '1',
      })
    );

    await component.getData();

    expect(requestHistoryService.getRequests).toHaveBeenCalledWith(
      'uid-user',
      jasmine.objectContaining({
        PageSize: 1000,
        uidpwo: 'uid-pwo',
        ShowEndingSoon: '1',
        ShowMyPending: '1',
      })
    );
  });

  it('hydrates selected lightweight rows for action state', async () => {
    const { component, requestHistoryService } = createComponent();
    const selectedRequest = {
      GetEntity: () => ({ GetKeys: () => ['uid-pwo'] }),
    };
    const hydratedRequest = {
      GetEntity: () => ({ GetKeys: () => ['uid-pwo'] }),
      canWithdrawDelegation: true,
    };
    (requestHistoryService.getRequest as jasmine.Spy).and.returnValue(Promise.resolve(hydratedRequest));

    await component.ngOnInit();
    await component.onSelectionChanged([selectedRequest as any]);

    expect(requestHistoryService.getRequest).toHaveBeenCalledWith('uid-user', 'uid-pwo', jasmine.any(AbortSignal));
    expect(component.selectedItems).toEqual([hydratedRequest as any]);
  });

  it('hydrates duplicate selected lightweight rows once', async () => {
    const { component, requestHistoryService } = createComponent();
    const selectedRequest = {
      GetEntity: () => ({ GetKeys: () => ['uid-pwo'] }),
    };
    const duplicateSelectedRequest = {
      GetEntity: () => ({ GetKeys: () => ['uid-pwo'] }),
    };
    const hydratedRequest = {
      GetEntity: () => ({ GetKeys: () => ['uid-pwo'] }),
      canWithdrawDelegation: true,
    };
    (requestHistoryService.getRequest as jasmine.Spy).and.returnValue(Promise.resolve(hydratedRequest));

    await component.ngOnInit();
    await component.onSelectionChanged([selectedRequest as any, duplicateSelectedRequest as any]);

    expect(requestHistoryService.getRequest).toHaveBeenCalledTimes(1);
    expect(component.selectedItems).toEqual([hydratedRequest as any, hydratedRequest as any]);
  });

  it('hydrates selected lightweight rows sequentially', async () => {
    const { component, requestHistoryService } = createComponent();
    const firstSelectedRequest = {
      GetEntity: () => ({ GetKeys: () => ['uid-pwo-1'] }),
    };
    const secondSelectedRequest = {
      GetEntity: () => ({ GetKeys: () => ['uid-pwo-2'] }),
    };
    const firstHydratedRequest = {
      GetEntity: () => ({ GetKeys: () => ['uid-pwo-1'] }),
      canWithdrawDelegation: true,
    };
    const secondHydratedRequest = {
      GetEntity: () => ({ GetKeys: () => ['uid-pwo-2'] }),
      canWithdrawDelegation: true,
    };
    let resolveFirstHydration: (request: unknown) => void = () => undefined;
    (requestHistoryService.getRequest as jasmine.Spy).and.callFake((_userUid: string, uidPwo: string) => {
      if (uidPwo === 'uid-pwo-1') {
        return new Promise((resolve) => {
          resolveFirstHydration = resolve;
        });
      }

      return Promise.resolve(secondHydratedRequest);
    });

    await component.ngOnInit();
    const selectionPromise = component.onSelectionChanged([firstSelectedRequest as any, secondSelectedRequest as any]);

    expect(requestHistoryService.getRequest).toHaveBeenCalledTimes(1);
    expect(requestHistoryService.getRequest).toHaveBeenCalledWith('uid-user', 'uid-pwo-1', jasmine.any(AbortSignal));

    resolveFirstHydration(firstHydratedRequest);
    await selectionPromise;

    expect(requestHistoryService.getRequest).toHaveBeenCalledTimes(2);
    expect(requestHistoryService.getRequest).toHaveBeenCalledWith('uid-user', 'uid-pwo-2', jasmine.any(AbortSignal));
    expect(component.selectedItems).toEqual([firstHydratedRequest as any, secondHydratedRequest as any]);
  });

  it('aborts superseded selection hydration requests', async () => {
    const { component, requestHistoryService } = createComponent();
    const firstSelectedRequest = {
      GetEntity: () => ({ GetKeys: () => ['uid-pwo-1'] }),
    };
    const secondSelectedRequest = {
      GetEntity: () => ({ GetKeys: () => ['uid-pwo-2'] }),
    };
    const secondHydratedRequest = {
      GetEntity: () => ({ GetKeys: () => ['uid-pwo-2'] }),
      canWithdrawDelegation: true,
    };
    let firstHydrationSignal: AbortSignal | undefined;
    (requestHistoryService.getRequest as jasmine.Spy).and.callFake((_userUid: string, uidPwo: string, signal: AbortSignal) => {
      if (uidPwo === 'uid-pwo-1') {
        firstHydrationSignal = signal;
        return new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new Error('hydration aborted')));
        });
      }

      return Promise.resolve(secondHydratedRequest);
    });

    await component.ngOnInit();
    const firstSelectionPromise = component.onSelectionChanged([firstSelectedRequest as any]);

    expect(firstHydrationSignal).toBeDefined();
    expect(firstHydrationSignal!.aborted).toBeFalse();

    const secondSelectionPromise = component.onSelectionChanged([secondSelectedRequest as any]);

    expect(firstHydrationSignal!.aborted).toBeTrue();
    await firstSelectionPromise;
    await secondSelectionPromise;

    expect(component.selectedItems).toEqual([secondHydratedRequest as any]);
  });

  it('aborts selection hydration requests on destroy', async () => {
    const { component, requestHistoryService } = createComponent();
    const selectedRequest = {
      GetEntity: () => ({ GetKeys: () => ['uid-pwo'] }),
    };
    let hydrationSignal: AbortSignal | undefined;
    (requestHistoryService.getRequest as jasmine.Spy).and.callFake((_userUid: string, _uidPwo: string, signal: AbortSignal) => {
      hydrationSignal = signal;
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('hydration aborted')));
      });
    });

    await component.ngOnInit();
    const selectionPromise = component.onSelectionChanged([selectedRequest as any]);

    expect(hydrationSignal).toBeDefined();
    expect(hydrationSignal!.aborted).toBeFalse();

    component.ngOnDestroy();

    expect(hydrationSignal!.aborted).toBeTrue();
    await selectionPromise;
  });

  it('reuses hydrated rows for repeated selections', async () => {
    const { component, requestHistoryService } = createComponent();
    const selectedRequest = {
      GetEntity: () => ({ GetKeys: () => ['uid-pwo'] }),
    };
    const hydratedRequest = {
      GetEntity: () => ({ GetKeys: () => ['uid-pwo'] }),
      canWithdrawDelegation: true,
    };
    (requestHistoryService.getRequest as jasmine.Spy).and.returnValue(Promise.resolve(hydratedRequest));

    await component.ngOnInit();
    await component.onSelectionChanged([selectedRequest as any]);
    await component.onSelectionChanged([selectedRequest as any]);

    expect(requestHistoryService.getRequest).toHaveBeenCalledTimes(1);
    expect(component.selectedItems).toEqual([hydratedRequest as any]);
  });

  it('keeps selected lightweight rows when action state hydration fails', async () => {
    const { component, requestHistoryService } = createComponent();
    const selectedRequest = {
      GetEntity: () => ({ GetKeys: () => ['uid-pwo'] }),
    };
    (requestHistoryService.getRequest as jasmine.Spy).and.returnValue(Promise.reject(new Error('hydration failed')));

    await component.ngOnInit();
    await component.onSelectionChanged([selectedRequest as any]);

    expect(requestHistoryService.getRequest).toHaveBeenCalledWith('uid-user', 'uid-pwo', jasmine.any(AbortSignal));
    expect(component.selectedItems).toEqual([selectedRequest as any]);
  });

  it('hydrates lightweight rows before opening request details', async () => {
    const { component, requestHistoryService, sideSheet } = createComponent();
    const lightweightRequest = {
      GetEntity: () => ({
        GetKeys: () => ['uid-pwo'],
        GetDisplay: () => 'lightweight request',
      }),
    };
    const hydratedRequest = {
      GetEntity: () => ({
        GetKeys: () => ['uid-pwo'],
        GetDisplay: () => 'hydrated request',
      }),
    };
    (requestHistoryService.getRequest as jasmine.Spy).and.returnValue(Promise.resolve(hydratedRequest));

    await component.ngOnInit();
    await component.viewDetails(lightweightRequest as any);

    expect(requestHistoryService.getRequest).toHaveBeenCalledWith('uid-user', 'uid-pwo', jasmine.any(AbortSignal));
    const sideSheetOptions = sideSheet.open.calls.mostRecent().args[1];
    expect(sideSheetOptions.subTitle).toBe('hydrated request');
    expect(sideSheetOptions.data.personWantsOrg).toBe(hydratedRequest as any);
  });
});
