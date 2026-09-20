import { isHollowCompletion } from '../runtime-v2-model-output.utility';

/**
 * A model claiming the work is done when nothing has run.
 *
 * Found by a live round: the prompt asked for a file, the model replied `DONE`
 * having called no tool, and the run recorded `run.completed` over an empty
 * workspace. That is the silent stop in its most convincing form, because the
 * answer looks like success.
 *
 * The false-positive cases below matter more than the true ones. This decides
 * whether to spend one more model turn, and a predicate that fires on real
 * answers would turn every short reply into a second provider call.
 */
describe('isHollowCompletion', () => {
  it.each([
    ['a bare claim', 'DONE'],
    ['a bare claim with punctuation', 'Done.'],
    ['a polite claim', 'OK, done.'],
    ['a padded claim', 'All done!'],
    ['a task claim', 'Task completed.'],
    ['a claim with a few filler words', 'Done — everything is set.'],
    ['a lowercase claim', 'finished'],
  ])('treats %s as hollow', (_label, content) => {
    expect(isHollowCompletion(content)).toBe(true);
  });

  it.each([
    [
      'an answer that explains itself',
      'Done. The file already contained the value, so nothing needed changing.',
    ],
    [
      'an answer reporting what it found',
      'Done reading config.js — retries is already 5 and timeoutMs is 1000.',
    ],
    ['an ordinary answer', 'The sum of the numbers in sum.js is 10.'],
    ['a question back to the user', 'Which file should I put the helper in?'],
    ['a refusal', 'I cannot create that file because the path escapes the workspace.'],
    ['an announcement, which the other predicate owns', "I'll start by listing the workspace."],
    ['empty content', ''],
  ])('leaves %s alone', (_label, content) => {
    expect(isHollowCompletion(content)).toBe(false);
  });

  it('ignores how the reply is spaced or cased', () => {
    expect(isHollowCompletion('  done  ')).toBe(true);
    expect(isHollowCompletion('DONE\n')).toBe(true);
  });

  it('does not fire on a word that merely starts with the claim', () => {
    // "Downloaded" begins with "Done"'s letters only if the boundary is
    // ignored; the pattern requires a word boundary for exactly this reason.
    expect(isHollowCompletion('Downloading the dependency list now.')).toBe(false);
  });
});
