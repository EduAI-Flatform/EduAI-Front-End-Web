import { describe, expect, it } from 'vitest';
import { learningStatus } from './learning-status';

describe('learning status', () => {
  it('uses completion status before progress and distinguishes untouched courses', () => {
    expect(learningStatus({ status: 'completed', progress: { progressPercent: 0 } })).toBe('completed');
    expect(learningStatus({ status: 'active', progress: { progressPercent: 100 } })).toBe('completed');
    expect(learningStatus({ status: 'active', progress: { progressPercent: 50 } })).toBe('in_progress');
    expect(learningStatus({ status: 'active', progress: { progressPercent: 0 } })).toBe('not_started');
  });
  it('matches rounded progress shown on course cards', () => {
    expect(learningStatus({ status: 'active', progress: { progressPercent: 99.9 } })).toBe('completed');
    expect(learningStatus({ status: 'active', progress: { progressPercent: -1 } })).toBe('not_started');
  });
});
