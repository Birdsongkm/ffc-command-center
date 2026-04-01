/**
 * Board meeting prep automation — helpers
 *
 * Covers:
 *  - getBoardMeetingDeadline  (Thursday before meeting date)
 *  - buildBoardDocName        (copy doc naming)
 *  - buildStaffEmailSubject   (staff draft subject)
 *  - buildStaffEmailBody      (staff draft body)
 *  - buildBoardEmailSubject   (board email subject)
 *  - buildBoardEmailBody      (board email body)
 *  - getNextBoardMeeting      (calendar event lookup)
 *  - extractDocPlainText      (Google Docs body → string)
 *  - buildAgendaSection       (new agenda section text)
 */

// ── Pure helpers (duplicated inline — project pattern) ─────────────────────────

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function parseDateLocal(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d); // local midnight — avoids UTC day-shift
}

function getBoardMeetingDeadline(boardMeetingDateStr) {
  const d = parseDateLocal(boardMeetingDateStr);
  // Walk backward from the day before meeting to find the Thursday
  const prev = new Date(d);
  prev.setDate(d.getDate() - 1);
  while (prev.getDay() !== 4) { // 4 = Thursday
    prev.setDate(prev.getDate() - 1);
  }
  return prev;
}

function buildBoardDocName(meetingLabel, year) {
  return `${meetingLabel} ${year}- Board Report- FFC`;
}

function buildStaffEmailSubject(meetingLabel, deadlineDate) {
  const m = deadlineDate.getMonth() + 1;
  const d = deadlineDate.getDate();
  return `${meetingLabel} Board Report (Due ${m}/${d})`;
}

function buildStaffEmailBody(meetingLabel, docUrl, deadlineStr) {
  return `Hi team,

Here's the ${meetingLabel} Board Report — please update your section(s) by EOB ${deadlineStr}.

As always, the previous info is highlighted in grey — please remove the grey as you update, and let me know once your section is ready to go.

Thank you!
${docUrl}`;
}

function buildBoardEmailSubject(meetingDateStr) {
  const d = parseDateLocal(meetingDateStr);
  const dayName = DAY_NAMES[d.getDay()];
  return `Materials to Review- Board Meeting ${dayName}`;
}

function buildBoardEmailBody(meetingDateStr, meetingTimeStr, boardReportUrl, financialsUrl, agendaUrl) {
  const d = parseDateLocal(meetingDateStr);
  const dayName = DAY_NAMES[d.getDay()];
  const month = MONTH_NAMES[d.getMonth()];
  const date = d.getDate();
  return `Dear board members,

I am looking forward to our meeting this ${dayName}, ${month} ${date} at ${meetingTimeStr}. Please review all materials in advance.

- Board Report
${boardReportUrl}

- Financial Statements
${financialsUrl}

- Meeting Agenda
${agendaUrl}

Thank you all for everything you do!
Kayla`;
}

function getNextBoardMeeting(events, daysAhead, nowMs) {
  const now = nowMs !== undefined ? nowMs : Date.now();
  const cutoff = now + daysAhead * 24 * 60 * 60 * 1000;
  const matches = (events || []).filter(ev => {
    const title = (ev.title || ev.summary || '').toLowerCase();
    if (!title.includes('board meeting')) return false;
    const start = new Date(ev.start?.dateTime || ev.start?.date || ev.start).getTime();
    return start > now && start <= cutoff;
  });
  if (!matches.length) return null;
  return matches.sort((a, b) => {
    const aStart = new Date(a.start?.dateTime || a.start?.date || a.start).getTime();
    const bStart = new Date(b.start?.dateTime || b.start?.date || b.start).getTime();
    return aStart - bStart;
  })[0];
}

function extractDocPlainText(body) {
  if (!body || !body.content) return '';
  const parts = [];
  function processEl(el) {
    if (el.paragraph) {
      (el.paragraph.elements || []).forEach(e => {
        if (e.textRun?.content) parts.push(e.textRun.content);
      });
    } else if (el.table) {
      (el.table.tableRows || []).forEach(row => {
        (row.tableCells || []).forEach(cell => {
          (cell.content || []).forEach(processEl);
        });
      });
    }
  }
  body.content.forEach(processEl);
  return parts.join('');
}

function buildAgendaSection(meetingLabel, year, meetingDateStr, notetaker, icebreaker) {
  const d = parseDateLocal(meetingDateStr);
  const month = MONTH_NAMES[d.getMonth()];
  const dateNum = d.getDate();
  return `${meetingLabel.toUpperCase()} ${year} — FFC BOARD MEETING
Date: ${month} ${dateNum}, ${year}
Notetaker: ${notetaker} | Icebreaker: ${icebreaker}

AGENDA
1. Welcome & Icebreaker (${icebreaker})
2. Staff Introduction / Updates
3. Board Report Review
4. Financial Review
5. Strategic Discussion
6. Action Items & Next Steps
7. Adjourn

`;
}

// ── getBoardMeetingDeadline ────────────────────────────────────────────────────

describe('getBoardMeetingDeadline', () => {
  test('Monday meeting → previous Thursday', () => {
    // June 1, 2026 is Monday; Thursday before is May 28
    const result = getBoardMeetingDeadline('2026-06-01');
    expect(result.getDay()).toBe(4); // Thursday
    expect(result.getDate()).toBe(28);
    expect(result.getMonth()).toBe(4); // May
  });

  test('April 6, 2026 (Monday) → Thursday April 2', () => {
    const result = getBoardMeetingDeadline('2026-04-06');
    expect(result.getDay()).toBe(4);
    expect(result.getDate()).toBe(2);
    expect(result.getMonth()).toBe(3); // April
  });

  test('Wednesday meeting → previous Thursday (6 days back)', () => {
    // Wednesday = day 3; previous Thursday = 6 days back
    const result = getBoardMeetingDeadline('2026-04-08'); // April 8 = Wednesday
    expect(result.getDay()).toBe(4);
  });

  test('Thursday meeting → Thursday of the week before', () => {
    // April 9, 2026 is Thursday; day before is Wednesday → walk back to Thursday = April 2
    const result = getBoardMeetingDeadline('2026-04-09');
    expect(result.getDay()).toBe(4);
    expect(result.getDate()).toBe(2);
  });

  test('Saturday meeting → previous Thursday', () => {
    const result = getBoardMeetingDeadline('2026-04-11'); // Saturday
    expect(result.getDay()).toBe(4);
    expect(result.getDate()).toBe(9); // Thursday April 9
  });

  test('returns a Date object', () => {
    expect(getBoardMeetingDeadline('2026-06-01')).toBeInstanceOf(Date);
  });
});

// ── buildBoardDocName ─────────────────────────────────────────────────────────

describe('buildBoardDocName', () => {
  test('March 2026', () => {
    expect(buildBoardDocName('March', 2026)).toBe('March 2026- Board Report- FFC');
  });

  test('June 2026', () => {
    expect(buildBoardDocName('June', 2026)).toBe('June 2026- Board Report- FFC');
  });

  test('January 2027', () => {
    expect(buildBoardDocName('January', 2027)).toBe('January 2027- Board Report- FFC');
  });
});

// ── buildStaffEmailSubject ────────────────────────────────────────────────────

describe('buildStaffEmailSubject', () => {
  test('March meeting, deadline April 2', () => {
    const deadline = new Date(2026, 3, 2); // local April 2
    expect(buildStaffEmailSubject('March', deadline)).toBe('March Board Report (Due 4/2)');
  });

  test('June meeting, deadline May 28', () => {
    const deadline = new Date(2026, 4, 28); // local May 28
    expect(buildStaffEmailSubject('June', deadline)).toBe('June Board Report (Due 5/28)');
  });

  test('January meeting, deadline Jan 20', () => {
    const deadline = new Date(2027, 0, 20); // local Jan 20
    expect(buildStaffEmailSubject('January', deadline)).toBe('January Board Report (Due 1/20)');
  });
});

// ── buildStaffEmailBody ───────────────────────────────────────────────────────

describe('buildStaffEmailBody', () => {
  test('includes team greeting', () => {
    const body = buildStaffEmailBody('March', 'https://docs.google.com/doc/1', 'EOB Thursday, April 2');
    expect(body).toContain('Hi team');
  });

  test('includes meeting label', () => {
    const body = buildStaffEmailBody('June', 'https://docs.google.com/doc/1', 'EOB Thursday, May 28');
    expect(body).toContain('June Board Report');
  });

  test('includes doc URL', () => {
    const url = 'https://docs.google.com/document/d/abc123';
    const body = buildStaffEmailBody('March', url, 'EOB Thursday, April 2');
    expect(body).toContain(url);
  });

  test('includes deadline string', () => {
    const body = buildStaffEmailBody('March', 'https://docs.google.com/doc/1', 'EOB Thursday, April 2');
    expect(body).toContain('EOB Thursday, April 2');
  });

  test('mentions grey highlighting', () => {
    const body = buildStaffEmailBody('March', 'https://docs.google.com/doc/1', 'EOB Thursday, April 2');
    expect(body).toContain('grey');
  });
});

// ── buildBoardEmailSubject ────────────────────────────────────────────────────

describe('buildBoardEmailSubject', () => {
  test('Monday April 6 → Materials to Review- Board Meeting Monday', () => {
    expect(buildBoardEmailSubject('2026-04-06')).toBe('Materials to Review- Board Meeting Monday');
  });

  test('Monday June 1 → Materials to Review- Board Meeting Monday', () => {
    expect(buildBoardEmailSubject('2026-06-01')).toBe('Materials to Review- Board Meeting Monday');
  });

  test('includes the day name', () => {
    const result = buildBoardEmailSubject('2026-04-08'); // Wednesday
    expect(result).toContain('Wednesday');
  });
});

// ── buildBoardEmailBody ───────────────────────────────────────────────────────

describe('buildBoardEmailBody', () => {
  const urls = {
    report: 'https://docs.google.com/document/d/reportId',
    financials: 'https://docs.google.com/spreadsheets/d/finId',
    agenda: 'https://docs.google.com/document/d/agendaId',
  };

  test('opens with "Dear board members"', () => {
    const body = buildBoardEmailBody('2026-04-06', '2:30 PM MT', urls.report, urls.financials, urls.agenda);
    expect(body).toMatch(/^Dear board members/);
  });

  test('includes meeting time', () => {
    const body = buildBoardEmailBody('2026-04-06', '2:30 PM MT', urls.report, urls.financials, urls.agenda);
    expect(body).toContain('2:30 PM MT');
  });

  test('includes board report URL', () => {
    const body = buildBoardEmailBody('2026-04-06', '2:30 PM MT', urls.report, urls.financials, urls.agenda);
    expect(body).toContain(urls.report);
  });

  test('includes financials URL', () => {
    const body = buildBoardEmailBody('2026-04-06', '2:30 PM MT', urls.report, urls.financials, urls.agenda);
    expect(body).toContain(urls.financials);
  });

  test('includes agenda URL', () => {
    const body = buildBoardEmailBody('2026-04-06', '2:30 PM MT', urls.report, urls.financials, urls.agenda);
    expect(body).toContain(urls.agenda);
  });

  test('closes with Kayla signature', () => {
    const body = buildBoardEmailBody('2026-04-06', '2:30 PM MT', urls.report, urls.financials, urls.agenda);
    expect(body).toContain('Kayla');
  });
});

// ── getNextBoardMeeting ───────────────────────────────────────────────────────

const BASE_NOW = new Date('2026-04-01T00:00:00Z').getTime();

describe('getNextBoardMeeting', () => {
  test('returns null for empty events', () => {
    expect(getNextBoardMeeting([], 21, BASE_NOW)).toBeNull();
  });

  test('returns null if no board meeting in window', () => {
    const events = [{ title: 'FFC Board Meeting', start: { dateTime: '2026-06-01T20:30:00Z' } }];
    expect(getNextBoardMeeting(events, 14, BASE_NOW)).toBeNull();
  });

  test('returns event if board meeting within window', () => {
    const events = [{ title: 'FFC Board Meeting ', start: { dateTime: '2026-04-06T20:30:00Z' } }];
    const result = getNextBoardMeeting(events, 21, BASE_NOW);
    expect(result).not.toBeNull();
    expect(result.title).toContain('Board Meeting');
  });

  test('returns the soonest board meeting if multiple', () => {
    const events = [
      { title: 'FFC Board Meeting', start: { dateTime: '2026-06-01T20:30:00Z' } },
      { title: 'FFC Board Meeting', start: { dateTime: '2026-04-06T20:30:00Z' } },
    ];
    const result = getNextBoardMeeting(events, 21, BASE_NOW);
    expect(result.start.dateTime).toContain('04-06');
  });

  test('excludes past events', () => {
    const events = [{ title: 'FFC Board Meeting', start: { dateTime: '2026-03-30T20:30:00Z' } }];
    expect(getNextBoardMeeting(events, 21, BASE_NOW)).toBeNull();
  });

  test('case-insensitive title match', () => {
    const events = [{ title: 'ffc board meeting', start: { dateTime: '2026-04-06T20:30:00Z' } }];
    expect(getNextBoardMeeting(events, 21, BASE_NOW)).not.toBeNull();
  });

  test('non-board events excluded', () => {
    const events = [{ title: 'Staff Meeting', start: { dateTime: '2026-04-06T20:30:00Z' } }];
    expect(getNextBoardMeeting(events, 21, BASE_NOW)).toBeNull();
  });

  test('returns null for null events', () => {
    expect(getNextBoardMeeting(null, 21, BASE_NOW)).toBeNull();
  });
});

// ── extractDocPlainText ───────────────────────────────────────────────────────

describe('extractDocPlainText', () => {
  test('returns empty string for null body', () => {
    expect(extractDocPlainText(null)).toBe('');
  });

  test('returns empty string for body with no content', () => {
    expect(extractDocPlainText({})).toBe('');
  });

  test('extracts text from paragraphs', () => {
    const body = {
      content: [
        { paragraph: { elements: [{ textRun: { content: 'Hello world\n' } }] } },
      ],
    };
    expect(extractDocPlainText(body)).toBe('Hello world\n');
  });

  test('concatenates multiple text runs', () => {
    const body = {
      content: [
        {
          paragraph: {
            elements: [
              { textRun: { content: 'Foo' } },
              { textRun: { content: ' Bar' } },
            ],
          },
        },
      ],
    };
    expect(extractDocPlainText(body)).toBe('Foo Bar');
  });

  test('extracts text from table cells', () => {
    const body = {
      content: [
        {
          table: {
            tableRows: [{
              tableCells: [{
                content: [{
                  paragraph: { elements: [{ textRun: { content: 'Table cell' } }] },
                }],
              }],
            }],
          },
        },
      ],
    };
    expect(extractDocPlainText(body)).toBe('Table cell');
  });

  test('skips elements without textRun', () => {
    const body = {
      content: [
        { paragraph: { elements: [{ inlineObjectElement: { inlineObjectId: 'img1' } }] } },
        { paragraph: { elements: [{ textRun: { content: 'text' } }] } },
      ],
    };
    expect(extractDocPlainText(body)).toBe('text');
  });

  test('returns empty string for empty content array', () => {
    expect(extractDocPlainText({ content: [] })).toBe('');
  });
});

// ── buildAgendaSection ────────────────────────────────────────────────────────

describe('buildAgendaSection', () => {
  test('includes meeting label and year', () => {
    const s = buildAgendaSection('March', 2026, '2026-04-06', 'Jack Fritzinger', 'James Iacino');
    expect(s).toContain('MARCH 2026');
  });

  test('includes notetaker name', () => {
    const s = buildAgendaSection('March', 2026, '2026-04-06', 'Jack Fritzinger', 'James Iacino');
    expect(s).toContain('Jack Fritzinger');
  });

  test('includes icebreaker name', () => {
    const s = buildAgendaSection('March', 2026, '2026-04-06', 'Jack Fritzinger', 'James Iacino');
    expect(s).toContain('James Iacino');
  });

  test('includes month and date', () => {
    const s = buildAgendaSection('March', 2026, '2026-04-06', 'Jack Fritzinger', 'James Iacino');
    expect(s).toContain('April 6, 2026');
  });

  test('includes basic agenda structure', () => {
    const s = buildAgendaSection('June', 2026, '2026-06-01', 'Ash Ganapathiraju', 'Bill Johnson');
    expect(s).toContain('AGENDA');
    expect(s).toContain('Welcome');
  });

  test('returns a non-empty string', () => {
    const s = buildAgendaSection('March', 2026, '2026-04-06', 'Jack', 'James');
    expect(typeof s).toBe('string');
    expect(s.length).toBeGreaterThan(50);
  });
});
