import { EntitlementsModule } from '../entitlements.module';
import { ThreadJobBudgetFreeMeterRepository } from '../../credit/repositories/thread-job-budget-free-meter.repository';
import { ThreadJobBudgetService } from '../../credit/services/thread-job-budget.service';

/**
 * Nest resolves a provider's constructor in the module that lists it. ThreadJobBudgetService is
 * listed here, so everything its constructor needs must be listed here too: production crash-looped
 * on boot ("can't resolve ThreadJobBudgetFreeMeterRepository") because unit tests never build the module.
 */
describe('EntitlementsModule providers', () => {
  const providers: unknown[] = Reflect.getMetadata('providers', EntitlementsModule) ?? [];

  it('lists the thread budget service and the repository it injects', () => {
    expect(providers).toContain(ThreadJobBudgetService);
    expect(providers).toContain(ThreadJobBudgetFreeMeterRepository);
  });
});
