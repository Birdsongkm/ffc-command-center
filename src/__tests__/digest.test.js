const { buildDigestText } = require('../lib/digest');

describe('buildDigestText', () => {
  test('all zeros → empty string', () => {
    expect(buildDigestText(0, [], [], [])).toBe('');
  });

  test('1 unread → singular', () => {
    expect(buildDigestText(1, [], [], [])).toBe('You have 1 unread email.');
  });

  test('5 unread → plural', () => {
    expect(buildDigestText(5, [], [], [])).toBe('You have 5 unread emails.');
  });

  test('1 needs response → singular "needs"', () => {
    expect(buildDigestText(0, [{ id: '1' }], [], [])).toBe('1 needs your reply.');
  });

  test('3 need response → plural "need"', () => {
    expect(buildDigestText(0, [{}, {}, {}], [], [])).toBe('3 need your reply.');
  });

  test('1 week event → singular', () => {
    expect(buildDigestText(0, [], [{ title: 'Board call' }], [])).toBe('1 meeting this week.');
  });

  test('4 week events → plural', () => {
    expect(buildDigestText(0, [], [{}, {}, {}, {}], [])).toBe('4 meetings this week.');
  });

  test('finance alert → shows sender name and subject', () => {
    const alerts = [{ from: 'Debbie Nash <debbie@freshfoodconnect.org>', subject: 'Q2 budget review' }];
    const result = buildDigestText(0, [], [], alerts);
    expect(result).toBe('Debbie Nash sent: "Q2 budget review".');
  });

  test('finance alert strips angle-bracket email from sender name', () => {
    const alerts = [{ from: 'Accounting Team <accounting@ffc.org>', subject: 'Invoice pending' }];
    const result = buildDigestText(0, [], [], alerts);
    expect(result).toContain('Accounting Team sent');
  });

  test('only first finance alert is surfaced', () => {
    const alerts = [
      { from: 'Debbie Nash <debbie@ffc.org>', subject: 'First alert' },
      { from: 'Carmen <carmen@ffc.org>', subject: 'Second alert' },
    ];
    const result = buildDigestText(0, [], [], alerts);
    expect(result).toContain('First alert');
    expect(result).not.toContain('Second alert');
  });

  test('all fields combined', () => {
    const result = buildDigestText(
      12,
      [{}, {}, {}],
      [{}, {}],
      [{ from: 'Debbie <debbie@ffc.org>', subject: 'Budget' }]
    );
    expect(result).toContain('12 unread emails');
    expect(result).toContain('3 need your reply');
    expect(result).toContain('2 meetings this week');
    expect(result).toContain('Debbie sent: "Budget"');
  });

  test('trims trailing whitespace when no finance alert', () => {
    const result = buildDigestText(3, [], [], []);
    expect(result).toBe('You have 3 unread emails.');
    expect(result).not.toMatch(/\s$/);
  });

  test('finance alert from with no display name uses raw from string', () => {
    const alerts = [{ from: 'debbie@ffc.org', subject: 'Note' }];
    const result = buildDigestText(0, [], [], alerts);
    expect(result).toContain('debbie@ffc.org sent: "Note"');
  });
});
