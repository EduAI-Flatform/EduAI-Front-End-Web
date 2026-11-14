import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PLATFORM_SETTINGS, withCourseQuizDefaults } from '../../../platform/platform.defaults';
import { QuizCreateForm } from './InstructorQuizManagementPage';
import * as auth from '../../../../services/auth.service';

let settings = structuredClone(DEFAULT_PLATFORM_SETTINGS);
vi.mock('../../../platform/PlatformProvider', () => ({ usePlatform: () => ({ settings, locale: 'en', t: (vi: string, en?: string) => en ?? vi }) }));
vi.mock('../../../../services/course.service', () => ({ courseService: { listInstructorLessons: vi.fn().mockResolvedValue([]) } }));
beforeEach(() => { settings = structuredClone(DEFAULT_PLATFORM_SETTINGS); vi.spyOn(auth, 'getAuthSession').mockReturnValue(null); });
afterEach(() => vi.restoreAllMocks());
function editor(onSubmit = vi.fn().mockResolvedValue(undefined)) {
  return { onSubmit, ...render(<MemoryRouter><QuizCreateForm courseId="course" isSaving={false} onSubmit={onSubmit} /></MemoryRouter>) };
}
const configured = () => Object.assign(settings.courses.quizDefaults, { passingScore: 85, timeLimitMinutes: 20, maxAttempts: 2,
  randomizeQuestions: true, randomizeOptions: true, showCorrectAnswers: false, isRequired: false, allowInstructorOverrides: false });

describe('quiz creation policy', () => {
  it('shows and submits effective defaults with teacher controls locked', async () => {
    configured(); const { onSubmit } = editor();
    expect(screen.getByRole('spinbutton', { name: 'Passing score (%)' })).toHaveValue(85);
    expect(screen.getByRole('spinbutton', { name: 'Passing score (%)' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Completion required' })).not.toBeChecked();
    fireEvent.change(screen.getByRole('textbox', { name: 'Quiz name' }), { target: { value: 'Policy quiz' } });
    fireEvent.click(screen.getByRole('button', { name: /^Generate quiz$/ }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ title: 'Policy quiz', passingScore: 85,
      timeLimitMinutes: 20, maxAttempts: 2, randomizeQuestions: true, randomizeOptions: true, showCorrectAnswers: false, isRequired: false })));
  });
  it('preserves entered titles and permitted overrides while untouched fields follow loaded policy', async () => {
    const { rerender } = editor();
    fireEvent.change(screen.getByRole('textbox', { name: 'Quiz name' }), { target: { value: 'Unsaved title' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Passing score (%)' }), { target: { value: '75' } });
    configured(); settings.courses.quizDefaults.allowInstructorOverrides = true;
    rerender(<MemoryRouter><QuizCreateForm courseId="course" isSaving={false} onSubmit={vi.fn()} /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole('spinbutton', { name: 'Duration in minutes' })).toHaveValue(20));
    expect(screen.getByRole('spinbutton', { name: 'Passing score (%)' })).toHaveValue(75);
    expect(screen.getByRole('textbox', { name: 'Quiz name' })).toHaveValue('Unsaved title');
  });
  it('lets a platform Admin override locked defaults', async () => {
    configured(); vi.mocked(auth.getAuthSession).mockReturnValue({ user: { roles: ['platform_admin'] } } as never);
    editor(); await waitFor(() => expect(screen.getByRole('spinbutton', { name: 'Passing score (%)' })).toBeEnabled());
  });
  it('renders historical courses with compatible defaults without rewriting their content', async () => {
    Reflect.deleteProperty(settings.courses, 'quizDefaults'); const before = JSON.stringify(settings.courses);
    expect(withCourseQuizDefaults(settings.courses)).toHaveProperty('quizDefaults.passingScore', 70);
    editor(); await waitFor(() => expect(screen.getByRole('spinbutton', { name: 'Passing score (%)' })).toHaveValue(70));
    expect(screen.getByRole('spinbutton', { name: 'Number of attempts' })).toHaveValue(null);
    expect(JSON.stringify(settings.courses)).toBe(before);
  });
});
