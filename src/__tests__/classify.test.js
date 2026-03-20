const { classifyEmail, isRealMeeting, getQuickReplies, extractCalendarRsvpLinks } = require('../lib/classify');

// ─── classifyEmail ────────────────────────────────────────────────────────────

describe('classifyEmail', () => {
  // DropboxSign / HelloSign — always needs-response regardless of other signals
  describe('DropboxSign / HelloSign override', () => {
    test('dropboxsign in from → needs-response', () => {
      expect(classifyEmail({ from: 'noreply@dropboxsign.com', recipientCount: 50 })).toBe('needs-response');
    });
    test('hellosign in from → needs-response', () => {
      expect(classifyEmail({ from: 'noreply@hellosign.com' })).toBe('needs-response');
    });
    test('dropbox.com in from → needs-response (not just dropboxsign)', () => {
      expect(classifyEmail({ from: 'no-reply@dropbox.com', listUnsubscribe: 'yes' })).toBe('needs-response');
    });
    test('hellosign with list headers still → needs-response', () => {
      expect(classifyEmail({ from: 'sign@hellosign.com', listId: 'somelist', recipientCount: 30 })).toBe('needs-response');
    });
  });

  // Mass send — threshold is exactly 20
  describe('fyi-mass', () => {
    test('19 recipients → NOT fyi-mass', () => {
      expect(classifyEmail({ from: 'someone@example.com', recipientCount: 19 })).not.toBe('fyi-mass');
    });
    test('20 recipients → fyi-mass', () => {
      expect(classifyEmail({ from: 'someone@example.com', recipientCount: 20 })).toBe('fyi-mass');
    });
    test('100 recipients → fyi-mass', () => {
      expect(classifyEmail({ from: 'bulk@newsletter.com', recipientCount: 100 })).toBe('fyi-mass');
    });
    test('classy with 20+ recipients → NOT fyi-mass (falls through to classy logic)', () => {
      expect(classifyEmail({ from: 'noreply@classy.org', recipientCount: 25 })).not.toBe('fyi-mass');
    });
    test('hubspot with 20+ recipients → NOT fyi-mass', () => {
      expect(classifyEmail({ from: 'noreply@hubspot.com', recipientCount: 25 })).not.toBe('fyi-mass');
    });
  });

  // Newsletter / list mail
  describe('newsletter', () => {
    test('List-Unsubscribe header → newsletter', () => {
      expect(classifyEmail({ from: 'news@example.com', listUnsubscribe: '<mailto:unsub@example.com>' })).toBe('newsletter');
    });
    test('List-Id header → newsletter', () => {
      expect(classifyEmail({ from: 'news@example.com', listId: 'weekly-digest.example.com' })).toBe('newsletter');
    });
    test('precedence=list → newsletter', () => {
      expect(classifyEmail({ from: 'news@example.com', precedence: 'list' })).toBe('newsletter');
    });
    test('precedence=bulk → newsletter', () => {
      expect(classifyEmail({ from: 'news@example.com', precedence: 'bulk' })).toBe('newsletter');
    });
    test('classy with list header → classy-recurring, not newsletter', () => {
      expect(classifyEmail({ from: 'noreply@classy.org', listId: 'classy.list' })).toBe('classy-recurring');
    });
    test('fundrais in from with list header → classy-recurring', () => {
      expect(classifyEmail({ from: 'news@myfundrais.org', listUnsubscribe: 'yes' })).toBe('classy-recurring');
    });
  });

  // Calendar notifications
  describe('calendar-notif', () => {
    test('calendar-notification in from → calendar-notif', () => {
      expect(classifyEmail({ from: 'calendar-notification@google.com' })).toBe('calendar-notif');
    });
    test('calendar.google.com in from → calendar-notif', () => {
      expect(classifyEmail({ from: 'no-reply@calendar.google.com' })).toBe('calendar-notif');
    });
  });

  // Docs / Drive activity
  describe('docs-activity', () => {
    test('drive-shares-dm → docs-activity', () => {
      expect(classifyEmail({ from: 'drive-shares-dm@google.com' })).toBe('docs-activity');
    });
    test('comments-noreply → docs-activity', () => {
      expect(classifyEmail({ from: 'comments-noreply@docs.google.com' })).toBe('docs-activity');
    });
    test('docs.google.com in from → docs-activity', () => {
      expect(classifyEmail({ from: 'noreply@docs.google.com' })).toBe('docs-activity');
    });
    test('drive.google.com in from → docs-activity', () => {
      expect(classifyEmail({ from: 'noreply@drive.google.com' })).toBe('docs-activity');
    });
  });

  // Automated / system mail
  describe('automated', () => {
    test('noreply in from → automated', () => {
      expect(classifyEmail({ from: 'noreply@someservice.com' })).toBe('automated');
    });
    test('no-reply in from → automated', () => {
      expect(classifyEmail({ from: 'no-reply@stripe.com' })).toBe('automated');
    });
    test('notifications@ in from → automated', () => {
      expect(classifyEmail({ from: 'notifications@github.com' })).toBe('automated');
    });
    test('mailer-daemon in from → automated', () => {
      expect(classifyEmail({ from: 'mailer-daemon@mail.example.com' })).toBe('automated');
    });
    test('postmaster in from → automated', () => {
      expect(classifyEmail({ from: 'postmaster@example.com' })).toBe('automated');
    });
  });

  // Classy one-time donations
  describe('classy-onetime', () => {
    test('classy in from + donation in subject → classy-onetime', () => {
      expect(classifyEmail({ from: 'noreply@classy.org', subject: 'New donation received' })).toBe('classy-onetime');
    });
    test('classy in from + gift in subject → classy-onetime', () => {
      expect(classifyEmail({ from: 'giving@classy.org', subject: 'A new gift!' })).toBe('classy-onetime');
    });
    test('classy in from + contribut in subject → classy-onetime', () => {
      expect(classifyEmail({ from: 'giving@classy.org', subject: 'Contribution received' })).toBe('classy-onetime');
    });
    test('classy in subject + donation in subject → classy-onetime', () => {
      expect(classifyEmail({ from: 'giving@partner.org', subject: 'Classy donation alert' })).toBe('classy-onetime');
    });
    test('classy in from, no donation keyword → classy-recurring', () => {
      expect(classifyEmail({ from: 'noreply@classy.org', subject: 'Your account update' })).toBe('classy-recurring');
    });
  });

  // Classy recurring (platform emails without donation signal)
  describe('classy-recurring', () => {
    test('classy in from, no donation keyword → classy-recurring', () => {
      expect(classifyEmail({ from: 'platform@classy.org', subject: 'Campaign update' })).toBe('classy-recurring');
    });
  });

  // Team / internal
  describe('team', () => {
    test('freshfoodconnect in from → team', () => {
      expect(classifyEmail({ from: 'laura@freshfoodconnect.org' })).toBe('team');
    });
    test('@ffc in from → team', () => {
      expect(classifyEmail({ from: 'gretchen@ffc.org' })).toBe('team');
    });
  });

  // needs-response (default)
  describe('needs-response', () => {
    test('personal email, 1 recipient → needs-response', () => {
      expect(classifyEmail({ from: 'donor@gmail.com', recipientCount: 1 })).toBe('needs-response');
    });
    test('no from, no signals → needs-response', () => {
      expect(classifyEmail({})).toBe('needs-response');
    });
    test('recipientCount defaults to 1 when absent → needs-response', () => {
      expect(classifyEmail({ from: 'someone@partner.org' })).toBe('needs-response');
    });
    test('3 recipients → needs-response', () => {
      expect(classifyEmail({ from: 'partner@org.com', recipientCount: 3 })).toBe('needs-response');
    });
  });
});

// ─── isRealMeeting ────────────────────────────────────────────────────────────

describe('isRealMeeting', () => {
  test('multi-attendee meeting → real', () => {
    expect(isRealMeeting({ title: 'Board sync', attendees: [{ email: 'a@b.com' }, { email: 'c@d.com' }] })).toBe(true);
  });
  test('solo event with hangout link → real', () => {
    expect(isRealMeeting({ title: 'Deep work', attendees: [], hangoutLink: 'https://meet.google.com/abc' })).toBe(true);
  });
  test('solo event without hangout link → not real', () => {
    expect(isRealMeeting({ title: 'Deep work', attendees: [] })).toBe(false);
  });
  test('no attendees, no hangout → not real', () => {
    expect(isRealMeeting({ title: 'Think time' })).toBe(false);
  });

  // Block word checks — only filter if solo
  test('"hold" solo → not real', () => {
    expect(isRealMeeting({ title: 'Hold for later', attendees: [] })).toBe(false);
  });
  test('"lunch" solo → not real', () => {
    expect(isRealMeeting({ title: 'Team lunch', attendees: [{ email: 'me@ffc.org' }] })).toBe(false);
  });
  test('"ooo" solo → not real', () => {
    expect(isRealMeeting({ title: 'OOO - vacation', attendees: [] })).toBe(false);
  });
  test('"out of office" solo → not real', () => {
    expect(isRealMeeting({ title: 'Out of office', attendees: [] })).toBe(false);
  });
  test('"block" solo → not real', () => {
    expect(isRealMeeting({ title: 'Focus block', attendees: [] })).toBe(false);
  });
  test('"focus" solo → not real', () => {
    expect(isRealMeeting({ title: 'Focus time', attendees: [] })).toBe(false);
  });
  test('"gym" solo → not real', () => {
    expect(isRealMeeting({ title: 'Gym', attendees: [] })).toBe(false);
  });
  test('"commute" solo → not real', () => {
    expect(isRealMeeting({ title: 'Commute', attendees: [] })).toBe(false);
  });
  test('"travel" solo → not real', () => {
    expect(isRealMeeting({ title: 'Travel day', attendees: [] })).toBe(false);
  });
  test('"personal" solo → not real', () => {
    expect(isRealMeeting({ title: 'Personal appointment', attendees: [] })).toBe(false);
  });

  // Block words don't filter if there are multiple attendees
  test('"lunch" with multiple attendees → still real', () => {
    expect(isRealMeeting({
      title: 'Team lunch',
      attendees: [{ email: 'a@ffc.org' }, { email: 'b@ffc.org' }],
    })).toBe(true);
  });
  test('"hold" with multiple attendees → still real', () => {
    expect(isRealMeeting({
      title: 'Hold: strategy review',
      attendees: [{ email: 'a@ffc.org' }, { email: 'b@ffc.org' }],
    })).toBe(true);
  });

  // Case insensitivity
  test('title case "OOO" → not real (case insensitive)', () => {
    expect(isRealMeeting({ title: 'OOO Friday', attendees: [] })).toBe(false);
  });
});

// ─── getQuickReplies ──────────────────────────────────────────────────────────

describe('getQuickReplies', () => {
  test('classy-onetime → donor-focused replies', () => {
    const replies = getQuickReplies({ from: 'noreply@classy.org', subject: 'New donation received' });
    expect(replies.length).toBe(3);
    expect(replies[0].label).toBe('Thank donor');
    expect(replies[1].label).toBe('Acknowledge');
    expect(replies[2].label).toBe('Loop in team');
  });

  test('team email → team-focused replies', () => {
    const replies = getQuickReplies({ from: 'laura@freshfoodconnect.org', subject: 'Quick update' });
    expect(replies.length).toBe(3);
    expect(replies[0].label).toBe('Sounds good');
    expect(replies[1].label).toBe("Let's discuss");
    expect(replies[2].label).toBe('On it');
  });

  test('subject contains "meeting" → meeting replies', () => {
    const replies = getQuickReplies({ from: 'partner@org.com', subject: 'Meeting tomorrow?' });
    expect(replies.length).toBe(3);
    expect(replies[0].label).toBe('Confirm');
    expect(replies[1].label).toBe('Reschedule');
    expect(replies[2].label).toBe('Decline');
  });

  test('subject contains "call" → meeting replies', () => {
    const replies = getQuickReplies({ from: 'partner@org.com', subject: 'Schedule a call' });
    expect(replies[0].label).toBe('Confirm');
  });

  test('subject contains "sync" → meeting replies', () => {
    const replies = getQuickReplies({ from: 'partner@org.com', subject: 'Weekly sync' });
    expect(replies[0].label).toBe('Confirm');
  });

  test('unclassified email → generic replies', () => {
    const replies = getQuickReplies({ from: 'donor@gmail.com', subject: 'Question about your org' });
    expect(replies.length).toBe(3);
    expect(replies[0].label).toBe('Yes, sounds good');
    expect(replies[1].label).toBe('Let me get back to you');
    expect(replies[2].label).toBe('Loop in team');
  });

  test('all replies have label and text', () => {
    const inputs = [
      { from: 'noreply@classy.org', subject: 'donation' },
      { from: 'laura@freshfoodconnect.org', subject: 'update' },
      { from: 'partner@org.com', subject: 'meeting request' },
      { from: 'donor@gmail.com', subject: 'hello' },
    ];
    inputs.forEach(email => {
      const replies = getQuickReplies(email);
      replies.forEach(r => {
        expect(typeof r.label).toBe('string');
        expect(r.label.length).toBeGreaterThan(0);
        expect(typeof r.text).toBe('string');
        expect(r.text.length).toBeGreaterThan(0);
      });
    });
  });
});

// ─── extractCalendarRsvpLinks ─────────────────────────────────────────────────

describe('extractCalendarRsvpLinks', () => {
  test('null html → empty object', () => {
    expect(extractCalendarRsvpLinks(null)).toEqual({});
  });

  test('empty string → empty object', () => {
    expect(extractCalendarRsvpLinks('')).toEqual({});
  });

  test('html with no RSVP links → empty object', () => {
    expect(extractCalendarRsvpLinks('<p>No links here</p>')).toEqual({});
  });

  test('extracts accept link', () => {
    const html = '<a href="https://calendar.google.com/rsvp?action=ACCEPT&eid=abc">Yes</a>';
    const result = extractCalendarRsvpLinks(html);
    expect(result.accept).toBe('https://calendar.google.com/rsvp?action=ACCEPT&eid=abc');
  });

  test('extracts decline link', () => {
    const html = '<a href="https://calendar.google.com/rsvp?action=DECLINE&eid=abc">No</a>';
    const result = extractCalendarRsvpLinks(html);
    expect(result.decline).toBe('https://calendar.google.com/rsvp?action=DECLINE&eid=abc');
  });

  test('extracts tentative/maybe link', () => {
    const html = '<a href="https://calendar.google.com/rsvp?action=TENTATIVE&eid=abc">Maybe</a>';
    const result = extractCalendarRsvpLinks(html);
    expect(result.maybe).toBe('https://calendar.google.com/rsvp?action=TENTATIVE&eid=abc');
  });

  test('decodes &amp; to & in accept link', () => {
    const html = '<a href="https://calendar.google.com/rsvp?action=ACCEPT&amp;eid=abc&amp;tok=xyz">Yes</a>';
    const result = extractCalendarRsvpLinks(html);
    expect(result.accept).toBe('https://calendar.google.com/rsvp?action=ACCEPT&eid=abc&tok=xyz');
  });

  test('decodes &amp; to & in decline link', () => {
    const html = '<a href="https://calendar.google.com/rsvp?action=DECLINE&amp;eid=abc">No</a>';
    const result = extractCalendarRsvpLinks(html);
    expect(result.decline).toBe('https://calendar.google.com/rsvp?action=DECLINE&eid=abc');
  });

  test('extracts all three links from full calendar email', () => {
    const html = `
      <a href="https://calendar.google.com/rsvp?action=ACCEPT&amp;eid=123">Yes</a>
      <a href="https://calendar.google.com/rsvp?action=DECLINE&amp;eid=123">No</a>
      <a href="https://calendar.google.com/rsvp?action=TENTATIVE&amp;eid=123">Maybe</a>
    `;
    const result = extractCalendarRsvpLinks(html);
    expect(result.accept).toContain('action=ACCEPT');
    expect(result.decline).toContain('action=DECLINE');
    expect(result.maybe).toContain('action=TENTATIVE');
  });

  test('case insensitive matching for action', () => {
    const html = '<a href="https://calendar.google.com/rsvp?ACTION=ACCEPT&eid=abc">Yes</a>';
    const result = extractCalendarRsvpLinks(html);
    expect(result.accept).toBeDefined();
  });

  test('missing accept → no accept key', () => {
    const html = '<a href="https://calendar.google.com/rsvp?action=DECLINE&eid=abc">No</a>';
    const result = extractCalendarRsvpLinks(html);
    expect(result.accept).toBeUndefined();
    expect(result.decline).toBeDefined();
  });

  test('http links also extracted (not just https)', () => {
    const html = '<a href="http://calendar.google.com/rsvp?action=ACCEPT&eid=abc">Yes</a>';
    const result = extractCalendarRsvpLinks(html);
    expect(result.accept).toBeDefined();
  });
});
