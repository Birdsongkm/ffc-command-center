/**
 * Thread deduplication — issue #91
 * Tests: deduplicateByThread
 *
 * Gmail returns one entry per message, not per thread. If a thread has multiple
 * unread messages, all appear in the inbox list. deduplicateByThread keeps only
 * the first (most-recent) message per threadId, and adds unreadCount so the UI
 * can show a badge for threads with multiple unreads (Gmail conversation style).
 */

// ── Pure helper (duplicated inline — project pattern) ─────────────────────────

function deduplicateByThread(emails) {
  const threadCounts = {};
  for (const e of emails) {
    if (e.threadId) threadCounts[e.threadId] = (threadCounts[e.threadId] || 0) + 1;
  }
  const seen = new Set();
  return emails
    .filter(e => {
      if (!e.threadId || seen.has(e.threadId)) return false;
      seen.add(e.threadId);
      return true;
    })
    .map(e => ({ ...e, unreadCount: threadCounts[e.threadId] || 1 }));
}

// ── deduplicateByThread ───────────────────────────────────────────────────────

describe('deduplicateByThread', () => {
  test('empty array → empty array', () => {
    expect(deduplicateByThread([])).toEqual([]);
  });

  test('single message → returned with unreadCount 1', () => {
    const emails = [{ id: 'msg1', threadId: 'thread1' }];
    expect(deduplicateByThread(emails)).toEqual([{ id: 'msg1', threadId: 'thread1', unreadCount: 1 }]);
  });

  test('two messages same thread → only first kept, unreadCount 2', () => {
    const emails = [
      { id: 'msg1', threadId: 'thread1' },
      { id: 'msg2', threadId: 'thread1' },
    ];
    const result = deduplicateByThread(emails);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('msg1');
    expect(result[0].unreadCount).toBe(2);
  });

  test('two messages different threads → both kept, each unreadCount 1', () => {
    const emails = [
      { id: 'msg1', threadId: 'threadA' },
      { id: 'msg2', threadId: 'threadB' },
    ];
    const result = deduplicateByThread(emails);
    expect(result).toHaveLength(2);
    expect(result[0].unreadCount).toBe(1);
    expect(result[1].unreadCount).toBe(1);
  });

  test('three messages: two in one thread, one in another → two results with correct counts', () => {
    const emails = [
      { id: 'msg1', threadId: 'threadA' },
      { id: 'msg2', threadId: 'threadA' },
      { id: 'msg3', threadId: 'threadB' },
    ];
    const result = deduplicateByThread(emails);
    expect(result).toHaveLength(2);
    expect(result.map(e => e.id)).toEqual(['msg1', 'msg3']);
    expect(result[0].unreadCount).toBe(2);
    expect(result[1].unreadCount).toBe(1);
  });

  test('preserves order — first occurrence of each threadId', () => {
    const emails = [
      { id: 'a', threadId: 't1' },
      { id: 'b', threadId: 't2' },
      { id: 'c', threadId: 't1' },
      { id: 'd', threadId: 't3' },
      { id: 'e', threadId: 't2' },
    ];
    const result = deduplicateByThread(emails);
    expect(result.map(e => e.id)).toEqual(['a', 'b', 'd']);
  });

  test('message without threadId is excluded', () => {
    const emails = [
      { id: 'msg1' },
      { id: 'msg2', threadId: 'threadA' },
    ];
    const result = deduplicateByThread(emails);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('msg2');
  });

  test('message with null threadId is excluded', () => {
    const emails = [
      { id: 'msg1', threadId: null },
      { id: 'msg2', threadId: 'threadA' },
    ];
    const result = deduplicateByThread(emails);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('msg2');
  });

  test('all messages same thread → only first kept, unreadCount equals total', () => {
    const emails = [
      { id: 'msg1', threadId: 'thread1' },
      { id: 'msg2', threadId: 'thread1' },
      { id: 'msg3', threadId: 'thread1' },
    ];
    const result = deduplicateByThread(emails);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('msg1');
    expect(result[0].unreadCount).toBe(3);
  });

  test('preserves all original email fields on kept message', () => {
    const emails = [
      { id: 'msg1', threadId: 'thread1', from: 'sender@example.com', subject: 'Hello', unread: true },
      { id: 'msg2', threadId: 'thread1', from: 'reply@example.com', subject: 'Re: Hello', unread: true },
    ];
    const result = deduplicateByThread(emails);
    expect(result[0]).toMatchObject({ id: 'msg1', threadId: 'thread1', from: 'sender@example.com', subject: 'Hello', unread: true, unreadCount: 2 });
  });

  test('does not mutate the input array', () => {
    const emails = [
      { id: 'msg1', threadId: 'thread1' },
      { id: 'msg2', threadId: 'thread1' },
    ];
    const original = emails.map(e => ({ ...e }));
    deduplicateByThread(emails);
    expect(emails).toEqual(original);
  });

  test('unreadCount badge threshold — single-message thread has unreadCount 1 (no badge)', () => {
    const emails = [{ id: 'msg1', threadId: 't1' }];
    const result = deduplicateByThread(emails);
    expect(result[0].unreadCount).toBe(1);
  });

  test('unreadCount badge threshold — two-message thread has unreadCount 2 (show badge)', () => {
    const emails = [
      { id: 'msg1', threadId: 't1' },
      { id: 'msg2', threadId: 't1' },
    ];
    const result = deduplicateByThread(emails);
    expect(result[0].unreadCount).toBe(2);
  });
});
