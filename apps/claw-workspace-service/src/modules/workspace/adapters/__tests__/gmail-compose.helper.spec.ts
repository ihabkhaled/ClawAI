import { GmailComposeHelper } from '../gmail-compose.helper';

describe('GmailComposeHelper', () => {
  let helper: GmailComposeHelper;

  beforeEach(() => {
    helper = new GmailComposeHelper();
  });

  describe('signature append', () => {
    it('appends the signature with RFC 3676 separator when supplied', () => {
      const decision = helper.evaluate('u1', {
        to: 'a@b.com',
        subject: 'Hi',
        body: 'hello',
        signature: 'Best,\nAlice',
      });
      expect(decision.allowed).toBe(true);
      if (decision.allowed) {
        expect(decision.body).toBe('hello\n\n-- \nBest,\nAlice');
      }
    });

    it('does not double the separator when body already contains one', () => {
      const decision = helper.evaluate('u1', {
        to: 'a@b.com',
        subject: 'Hi',
        body: 'hello\n-- \nalready-signed',
        signature: 'Best,\nAlice',
      });
      expect(decision.allowed).toBe(true);
      if (decision.allowed) {
        expect(decision.body).toBe('hello\n-- \nalready-signed');
      }
    });

    it('leaves body untouched when signature is missing or blank', () => {
      const d1 = helper.evaluate('u1', { to: 'a@b.com', subject: 'Hi', body: 'hello' });
      const d2 = helper.evaluate('u2', {
        to: 'a@b.com',
        subject: 'Hi',
        body: 'hello',
        signature: '   ',
      });
      if (d1.allowed) expect(d1.body).toBe('hello');
      if (d2.allowed) expect(d2.body).toBe('hello');
    });
  });

  describe('anti-loop — subject Re: pattern', () => {
    it('blocks subject with 5+ Re: prefixes', () => {
      const decision = helper.evaluate('u1', {
        to: 'a@b.com',
        subject: 'Re: Re: Re: Re: Re: original',
        body: 'x',
      });
      expect(decision.allowed).toBe(false);
      if (!decision.allowed) {
        expect(decision.reason).toBe('SUBJECT_LOOP');
      }
    });

    it('also recognises localized "Sv:" and "Aw:" Re-prefixes', () => {
      const decision = helper.evaluate('u1', {
        to: 'a@b.com',
        subject: 'Sv: Aw: Re: Sv: Re: hello',
        body: 'x',
      });
      expect(decision.allowed).toBe(false);
    });

    it('allows 1-2 Re: prefixes (normal reply chain)', () => {
      const decision = helper.evaluate('u1', {
        to: 'a@b.com',
        subject: 'Re: Re: planning',
        body: 'x',
      });
      expect(decision.allowed).toBe(true);
    });
  });

  describe('anti-loop — mailer-daemon recipients', () => {
    it('blocks no-reply@ addresses', () => {
      const decision = helper.evaluate('u1', {
        to: 'no-reply@notifications.example.com',
        subject: 'Hi',
        body: 'x',
      });
      expect(decision.allowed).toBe(false);
      if (!decision.allowed) {
        expect(decision.reason).toBe('TO_IS_MAILER_DAEMON');
      }
    });

    it('blocks mailer-daemon@ addresses regardless of casing', () => {
      const decision = helper.evaluate('u1', {
        to: 'MAILER-DAEMON@example.com',
        subject: 'Hi',
        body: 'x',
      });
      expect(decision.allowed).toBe(false);
    });

    it('blocks bounce@/bounces@/postmaster@', () => {
      for (const addr of ['bounce@x.com', 'bounces@x.com', 'postmaster@x.com']) {
        const d = helper.evaluate('u1', { to: addr, subject: 'Hi', body: 'x' });
        expect(d.allowed).toBe(false);
      }
    });

    it('allows regular addresses', () => {
      const decision = helper.evaluate('u1', {
        to: 'colleague@example.com',
        subject: 'Hi',
        body: 'x',
      });
      expect(decision.allowed).toBe(true);
    });
  });

  describe('anti-loop — duplicate-within-window', () => {
    it('blocks a second send to the same thread within 10 minutes', () => {
      const first = helper.evaluate('u1', {
        to: 'a@b.com',
        subject: 'Hi',
        body: 'x',
        threadId: 't-123',
      });
      expect(first.allowed).toBe(true);

      const second = helper.evaluate('u1', {
        to: 'a@b.com',
        subject: 'Hi (followup)',
        body: 'y',
        threadId: 't-123',
      });
      expect(second.allowed).toBe(false);
      if (!second.allowed) {
        expect(second.reason).toBe('DUPLICATE_WITHIN_WINDOW');
      }
    });

    it('uses In-Reply-To as a stronger key than threadId', () => {
      const a = helper.evaluate('u1', {
        to: 'a@b.com',
        subject: 'Hi',
        body: 'x',
        inReplyTo: '<msg-1@example>',
      });
      expect(a.allowed).toBe(true);
      const b = helper.evaluate('u1', {
        to: 'a@b.com',
        subject: 'Hi',
        body: 'x',
        inReplyTo: '<msg-1@example>',
      });
      expect(b.allowed).toBe(false);
    });

    it('isolates the dedup window per user', () => {
      const a = helper.evaluate('alice', {
        to: 'x@y.com',
        subject: 'Hi',
        body: 'x',
        threadId: 't-9',
      });
      expect(a.allowed).toBe(true);
      const b = helper.evaluate('bob', {
        to: 'x@y.com',
        subject: 'Hi',
        body: 'x',
        threadId: 't-9',
      });
      expect(b.allowed).toBe(true);
    });

    it('falls back to recipient+subject when no thread/inReplyTo present', () => {
      const a = helper.evaluate('u1', { to: 'a@b.com', subject: 'first time', body: 'x' });
      expect(a.allowed).toBe(true);
      const b = helper.evaluate('u1', { to: 'a@b.com', subject: 'first time', body: 'y' });
      expect(b.allowed).toBe(false);
    });

    it('reset() empties the dedup window', () => {
      helper.evaluate('u1', { to: 'a@b.com', subject: 'Hi', body: 'x', threadId: 't' });
      helper.reset();
      const after = helper.evaluate('u1', {
        to: 'a@b.com',
        subject: 'Hi',
        body: 'x',
        threadId: 't',
      });
      expect(after.allowed).toBe(true);
    });
  });
});
