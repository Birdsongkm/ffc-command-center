/**
 * Thread deduplication — issue #91
 * Tests: deduplicateByThread
 *
 * Gmail returns one entry per message, not per thread. If a thread has multiple
 * unread messages, all appear in the inbox list. deduplicateByThread keeps only
 * the first (most-recent) message per threadId, preventing duplicates in the UI.
 */

// ── Pure helper (duplicated inline — project pattern) ─────────────────────────

function deduplicateByThread(emails) {
  const seen = new Set();
  return emails.filter(e => {
    if (!e.threadId || seen.has(e.threadId)) return false;
    seen.add(e.threadId);
    return true;
  });
}

// ── deduplicateByThread ───────────────────────────────────────────────────────

describe('deduplicateByThread', () => {
  test('empty array → empty array', () => {
    expect(deduplicateByThread([])).toEqual([]);
  });

  test('single message → returned as-is', () => {
    const emails = [{ id: 'msg1', threadId: 'thread1' }];
    expect(deduplicateByThread(emails)).toEqual([{ id: 'msg1', threadId: 'thread1' }]);
  });

  test('two messages same thread → only first kept', () => {
    const emails = [
      { id: 'msg1', threadId: 'thread1' },
      { id: 'msg2', threadId: 'thread1' },
    ];
    const result = deduplicateByThread(emails);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('msg1');
  });

  test('two messages different threads → both kept', () => {
    const emails = [
      { id: 'msg1', threadId: 'threadA' },
      { id: 'msg2', threadId: 'threadB' },
    ];
    const result = deduplicateByThread(emails);
    expect(result).toHaveLength(2);
  });

  test('three messages: two in one thread, one in another → two results', () => {
    const emails = [
      { id: 'msg1', threadId: 'threadA' },
      { id: 'msg2', threadId: 'threadA' },
      { id: 'msg3', threadId: 'threadB' },
    ];
    const result = deduplicateByThread(emails);
    expect(result).toHaveLength(2);
    expect(result.map(e => e.id)).toEqual(['msg1', 'msg3']);
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

  test('all messages same thread → only first kept', () => {
    const emails = [
      { id: 'msg1', threadId: 'thread1' },
      { id: 'msg2', threadId: 'thread1' },
      { id: 'msg3', threadId: 'thread1' },
    ];
    const result = deduplicateByThread(emails);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('msg1');
  });

  test('preserves all email fields on kept message', () => {
    const emails = [
      { id: 'msg1', threadId: 'thread1', from: 'sender@example.com', subject: 'Hello', unread: true },
      { id: 'msg2', threadId: 'thread1', from: 'reply@example.com', subject: 'Re: Hello', unread: true },
    ];
    const result = deduplicateByThread(emails);
    expect(result[0]).toEqual({ id: 'msg1', threadId: 'thread1', from: 'sender@example.com', subject: 'Hello', unread: true });
  });

  test('does not mutate the input array', () => {
    const emails = [
      { id: 'msg1', threadId: 'thread1' },
      { id: 'msg2', threadId: 'thread1' },
    ];
    const original = [...emails];
    deduplicateByThread(emails);
    expect(emails).toEqual(original);
  });
});
