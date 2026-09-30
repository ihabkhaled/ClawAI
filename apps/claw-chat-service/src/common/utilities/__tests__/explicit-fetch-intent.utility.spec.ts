import { ResearchMode } from '../../enums/research-mode.enum';
import { resolveExplicitFetchMode } from '../explicit-fetch-intent.utility';

const URL_TEXT = 'https://abbott-de.myoncare.care/wearables/oauth/app-return?wearable=abbott';

describe('resolveExplicitFetchMode', () => {
  it.each([
    `crawl ${URL_TEXT}`,
    `Crawl ${URL_TEXT} and summarise it`,
    `curl ${URL_TEXT}`,
    `curl -L ${URL_TEXT}`,
    `please fetch ${URL_TEXT}`,
    `can you open ${URL_TEXT}`,
    `run curl ${URL_TEXT}`,
    `read example.com/pricing`,
    `ihab@admins-MacBook-Pro Libre % curl ${URL_TEXT}`,
  ])('runs the fetch for the command %j', (message) => {
    expect(resolveExplicitFetchMode(message)).toBe(ResearchMode.SEARCH_FETCH);
  });

  it.each([
    `give me curl command for ${URL_TEXT}`,
    `what does ${URL_TEXT} do?`,
    `I pasted ${URL_TEXT} earlier, why did it fail`,
    `explain how to crawl a site`,
    `curl is a tool for transfers`,
    'crawl',
    'hello',
  ])('does not fetch for %j', (message) => {
    expect(resolveExplicitFetchMode(message)).toBeNull();
  });

  it('needs a URL: a command with nothing to fetch does nothing', () => {
    expect(resolveExplicitFetchMode('open the door')).toBeNull();
  });
});
