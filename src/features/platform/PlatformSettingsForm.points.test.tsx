import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlatformSettingsForm } from './PlatformSettingsForm';

describe('supported point activity selection', () => {
  it('selects a registered server event rather than accepting an arbitrary event code', () => {
    const onChange = vi.fn();
    render(<PlatformSettingsForm field="event" value="" onChange={onChange} />);
    const select = screen.getByRole('combobox');
    expect(screen.getByRole('option', { name: 'Hoàn thành khóa học' })).toHaveValue('course.completed');
    fireEvent.change(select, { target: { value: 'course.completed' } });
    expect(onChange).toHaveBeenCalledWith('course.completed');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
