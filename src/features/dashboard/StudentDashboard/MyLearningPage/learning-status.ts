export type LearningStatus = 'not_started' | 'in_progress' | 'completed';

export function learningStatus(enrollment: { status: string; progress: { progressPercent: number } }): LearningStatus {
  const progress = Math.min(100, Math.max(0, Math.round(enrollment.progress.progressPercent)));
  if (enrollment.status === 'completed' || progress === 100) return 'completed';
  return progress > 0 ? 'in_progress' : 'not_started';
}
