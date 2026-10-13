import { PlanFeatureAccessMode, PlanFeatureWindow } from '../../../../generated/prisma';
import { toPluginCallsRule } from '../plugin-calls-rule.utility';

describe('toPluginCallsRule', () => {
  it('maps a number to a daily cap', () => {
    expect(toPluginCallsRule(100)).toEqual({
      accessMode: PlanFeatureAccessMode.LIMITED,
      limit: 100,
      window: PlanFeatureWindow.DAY,
    });
  });

  it('maps null to unlimited', () => {
    expect(toPluginCallsRule(null)).toEqual({
      accessMode: PlanFeatureAccessMode.ENABLED,
      limit: null,
      window: PlanFeatureWindow.DAY,
    });
  });

  it('maps 0 to disabled, not unlimited', () => {
    expect(toPluginCallsRule(0)).toEqual({
      accessMode: PlanFeatureAccessMode.DISABLED,
      limit: null,
      window: PlanFeatureWindow.DAY,
    });
  });
});
