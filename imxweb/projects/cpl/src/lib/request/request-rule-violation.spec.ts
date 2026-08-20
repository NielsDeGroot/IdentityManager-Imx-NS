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

import { RequestRuleViolation } from './request-rule-violation';

describe('RequestRuleViolation', () => {
  it('should create an instance', () => {
    expect(new RequestRuleViolation()).toBeTruthy();
  });

  it('should tolerate lightweight request history rows without PWO extended data', () => {
    const extension = new RequestRuleViolation();
    const item = {};

    expect(() => {
      extension.inputData = {
        dataSource: {
          Data: [item],
        },
        extendedData: [],
      } as any;
    }).not.toThrow();

    expect((item as any).complianceRuleViolation).toBeFalse();
  });

  it('should mark rows with compliance rule violations', () => {
    const extension = new RequestRuleViolation();
    const item = {
      pwoData: {
        WorkflowHistory: {
          Entities: [
            { Columns: { UID_ComplianceRule: { Value: '' } } },
            { Columns: { UID_ComplianceRule: { Value: 'uid-compliance-rule' } } },
          ],
        },
      },
    };

    extension.inputData = {
      dataSource: {
        Data: [item],
      },
      extendedData: [{}],
    } as any;

    expect((item as any).complianceRuleViolation).toBeTrue();
  });
});
