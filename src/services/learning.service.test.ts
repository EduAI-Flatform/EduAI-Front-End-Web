import { afterEach, describe, expect, it, vi } from 'vitest';
import { learningService } from './learning.service';

afterEach(() => vi.unstubAllGlobals());

function captureProgress() {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: {} }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  }));
  vi.stubGlobal('fetch', fetchMock);
  return () => JSON.parse(fetchMock.mock.calls[0][1].body as string);
}

describe('learning progress wire contract', () => {
  it('sends browser media times with the API precision without mutating the input', async () => {
    const payload = captureProgress();
    const input = { watchedSeconds: 12.345678, durationSeconds: 60.123456, lastPositionSeconds: 12.345678 };
    await learningService.updateLessonProgress('lesson-id', input);
    expect(payload()).toEqual({ watchedSeconds: 12.35, durationSeconds: 60.12, lastPositionSeconds: 12.35 });
    expect(input.watchedSeconds).toBe(12.345678);
  });

  it('omits unavailable non-finite media times instead of sending null', async () => {
    const payload = captureProgress();
    await learningService.updateLessonProgress('lesson-id', { durationSeconds: Infinity, watchedSeconds: NaN, lastPositionSeconds: 0 });
    expect(payload()).toEqual({ lastPositionSeconds: 0 });
  });

  it('preserves document progress and absent video fields', async () => {
    const payload = captureProgress();
    await learningService.updateLessonProgress('lesson-id', { documentProgressPercent: 45 });
    expect(payload()).toEqual({ documentProgressPercent: 45 });
  });

  it('does not turn invalid negative timestamps into accepted zero progress', async () => {
    const payload = captureProgress();
    await learningService.updateLessonProgress('lesson-id', { watchedSeconds: -0.001 });
    expect(payload()).toEqual({ watchedSeconds: -0.001 });
  });
});
