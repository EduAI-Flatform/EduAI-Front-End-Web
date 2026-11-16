import { useId } from 'react';
import { Link } from 'react-router-dom';
import { usePlatform, type PlatformSettings } from '../platform/PlatformProvider';
import './CourseProgramGroups.css';

type Program = PlatformSettings['courses']['categories'][number];
interface ProgramNavigationProps {
  programs: Program[];
  selectedId: string;
  onChange: (id: string) => void;
}

export function CourseProgramNavigation({ programs, selectedId, onChange }: ProgramNavigationProps) {
  const { locale, t } = usePlatform();
  const id = useId();
  const label = t('Nhóm chương trình', 'Program group');
  const known = programs.some(program => program.id === selectedId);
  return <aside className="course-programs">
    <div className="course-programs__mobile">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={selectedId} onChange={event => onChange(event.target.value)}>
        {!known && <option value={selectedId}>{t('Nhóm không khả dụng', 'Unavailable group')}</option>}
        {programs.map(program => <option key={program.id} value={program.id}>{program[locale]}</option>)}
      </select>
    </div>
    <nav className="course-programs__desktop" aria-label={label}>
      <h2>{label}</h2>
      {programs.map(program => <button type="button" key={program.id}
        aria-pressed={program.id === selectedId} onClick={() => onChange(program.id)}>{program[locale]}</button>)}
    </nav>
  </aside>;
}

export function CourseProgramUnavailable({ program, onReturn, canReturn }: {
  program?: Program; onReturn: () => void; canReturn: boolean;
}) {
  const { locale, t } = usePlatform();
  const Heading = program ? 'h3' : 'h2';
  return <section className="course-program-empty" aria-live="polite">
    {program && <h2>{program[locale]}</h2>}
    <Heading>{program ? t('Chưa có chương trình được kết nối', 'No connected programs yet')
      : t('Nhóm chương trình không còn khả dụng', 'This program group is unavailable')}</Heading>
    <p>{t('GDS chưa có dữ liệu chương trình cho nhóm này.', 'GDS has no program data for this group yet.')}</p>
    <div className="course-program-empty__actions">
      <Link to="/partners">{t('Tìm hiểu liên kết GDS', 'Explore GDS partnerships')}</Link>
      {canReturn && <button type="button" onClick={onReturn}>{t('Quay lại khóa học trực tuyến', 'Back to online courses')}</button>}
    </div>
  </section>;
}
