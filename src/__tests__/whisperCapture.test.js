/**
 * Whisper/voice capture tests — issue #95
 * Tests: transcript assembly logic, browser API availability check.
 */

// Pure function: assemble final + interim transcript
function assembleTranscript(existingText, results, resultIndex) {
  let finalTranscript = existingText;
  let interim = '';
  for (let i = resultIndex; i < results.length; i++) {
    if (results[i].isFinal) {
      finalTranscript += (finalTranscript ? ' ' : '') + results[i][0].transcript;
    } else {
      interim += results[i][0].transcript;
    }
  }
  return finalTranscript + (interim ? ' ' + interim : '');
}

// Check if speech recognition is available
function isSpeechRecognitionAvailable(windowObj) {
  return !!(windowObj && (windowObj.SpeechRecognition || windowObj.webkitSpeechRecognition));
}

describe("assembleTranscript", () => {
  test("appends final result to empty text", () => {
    const results = [{ isFinal: true, 0: { transcript: "hello world" } }];
    expect(assembleTranscript("", results, 0)).toBe("hello world");
  });

  test("appends final result to existing text with space", () => {
    const results = [{ isFinal: true, 0: { transcript: "more words" } }];
    expect(assembleTranscript("hello", results, 0)).toBe("hello more words");
  });

  test("includes interim results at end", () => {
    const results = [{ isFinal: false, 0: { transcript: "typing..." } }];
    expect(assembleTranscript("hello", results, 0)).toBe("hello typing...");
  });

  test("handles mix of final and interim", () => {
    const results = [
      { isFinal: true, 0: { transcript: "final part" } },
      { isFinal: false, 0: { transcript: "still going" } },
    ];
    expect(assembleTranscript("", results, 0)).toBe("final part still going");
  });

  test("respects resultIndex to skip earlier results", () => {
    const results = [
      { isFinal: true, 0: { transcript: "old" } },
      { isFinal: true, 0: { transcript: "new" } },
    ];
    expect(assembleTranscript("existing", results, 1)).toBe("existing new");
  });

  test("handles empty results", () => {
    expect(assembleTranscript("hello", [], 0)).toBe("hello");
  });

  test("multiple final results concatenate", () => {
    const results = [
      { isFinal: true, 0: { transcript: "one" } },
      { isFinal: true, 0: { transcript: "two" } },
      { isFinal: true, 0: { transcript: "three" } },
    ];
    expect(assembleTranscript("", results, 0)).toBe("one two three");
  });
});

describe("isSpeechRecognitionAvailable", () => {
  test("returns true when SpeechRecognition exists", () => {
    expect(isSpeechRecognitionAvailable({ SpeechRecognition: function() {} })).toBe(true);
  });

  test("returns true when webkitSpeechRecognition exists", () => {
    expect(isSpeechRecognitionAvailable({ webkitSpeechRecognition: function() {} })).toBe(true);
  });

  test("returns false when neither exists", () => {
    expect(isSpeechRecognitionAvailable({})).toBe(false);
  });

  test("returns false when window is null", () => {
    expect(isSpeechRecognitionAvailable(null)).toBe(false);
  });

  test("returns false when window is undefined", () => {
    expect(isSpeechRecognitionAvailable(undefined)).toBe(false);
  });
});
