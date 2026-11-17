import { useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Modal } from './modal';

function Controlled({ unavailable }: { unavailable?: 'disabled' | 'removed' | 'replaced' }) {
  const [open, setOpen] = useState(false);
  const [opened, setOpened] = useState(false);
  return <>
    {!(unavailable === 'removed' && open) && <button key={unavailable === 'replaced' ? String(open) : 'opener'} disabled={unavailable === 'disabled' && opened} onClick={() => { setOpened(true); setOpen(true); }}>External opener</button>}
    <Modal open={open} onOpenChange={setOpen} title="Controlled dialog" description="Controlled dialog description"><input aria-label="Dialog field" /></Modal>
  </>;
}

describe('Modal focus restoration', () => {
  it('preserves native Dialog.Trigger restoration', async () => {
    const user = userEvent.setup();
    render(<Modal trigger={<button>Native opener</button>} title="Native dialog" description="Native dialog description"><input aria-label="Dialog field" /></Modal>);
    const opener = screen.getByRole('button', { name: 'Native opener' });
    await user.click(opener);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it('restores the external opener after Escape and refreshes it on the next opening', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    const opener = screen.getByRole('button', { name: 'External opener' });
    for (let cycle = 0; cycle < 2; cycle++) {
      await user.click(opener);
      await user.keyboard('{Escape}');
      await waitFor(() => expect(opener).toHaveFocus());
    }
  });

  for (const unavailable of ['disabled', 'removed', 'replaced'] as const) {
    it('does not restore to an opener that became ' + unavailable, async () => {
      const user = userEvent.setup();
      render(<Controlled unavailable={unavailable} />);
      const original = screen.getByRole('button', { name: 'External opener' });
      await user.click(original);
      await user.keyboard('{Escape}');
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(original).not.toHaveFocus();
      if (unavailable === 'replaced') expect(screen.getByRole('button', { name: 'External opener' })).not.toHaveFocus();
    });
  }

  it('restores nested dialogs to their own opener in order', async () => {
    function Nested() {
      const [outer, setOuter] = useState(false), [inner, setInner] = useState(false);
      return <>
        <button onClick={() => setOuter(true)}>Outer opener</button>
        <Modal open={outer} onOpenChange={setOuter} title="Outer dialog" description="Outer dialog description">
          <button onClick={() => setInner(true)}>Inner opener</button>
          <Modal open={inner} onOpenChange={setInner} title="Inner dialog" description="Inner dialog description"><input aria-label="Inner field" /></Modal>
        </Modal>
      </>;
    }
    const user = userEvent.setup();
    render(<Nested />);
    const outerOpener = screen.getByRole('button', { name: 'Outer opener' });
    await user.click(outerOpener);
    const innerOpener = screen.getByRole('button', { name: 'Inner opener' });
    await user.click(innerOpener);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(innerOpener).toHaveFocus());
    expect(screen.queryByRole('dialog', { name: 'Inner dialog' })).not.toBeInTheDocument();
    await user.click(within(screen.getByRole('dialog', { name: 'Outer dialog' })).getByRole('button', { name: 'Đóng' }));
    await waitFor(() => expect(outerOpener).toHaveFocus());
  });
  it('keeps the first Escape inside an expanded combobox', async () => {
    function ComboDialog() {
      const [open, setOpen] = useState(false), [expanded, setExpanded] = useState(true);
      return <>
        <button onClick={() => setOpen(true)}>Combo opener</button>
        <Modal open={open} onOpenChange={setOpen} title="Combo dialog" description="Choose an option">
          <button role="combobox" aria-label="Options" aria-expanded={expanded} onKeyDown={event => { if (event.key === 'Escape') setExpanded(false); }}>Options</button>
        </Modal>
      </>;
    }
    const user = userEvent.setup();
    render(<ComboDialog />);
    const opener = screen.getByRole('button', { name: 'Combo opener' });
    await user.click(opener);
    screen.getByRole('combobox').focus();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it('does not take focus from a newer dialog opened during close', async () => {
    function Replacement() {
      const [first, setFirst] = useState(false), [second, setSecond] = useState(false);
      return <>
        <button onClick={() => setFirst(true)}>First opener</button>
        <Modal open={first} onOpenChange={setFirst} title="First dialog" description="First">
          <button onClick={() => { setFirst(false); setSecond(true); }}>Next dialog</button>
        </Modal>
        <Modal open={second} onOpenChange={setSecond} title="Second dialog" description="Second"><input aria-label="Second field" /></Modal>
      </>;
    }
    const user = userEvent.setup();
    render(<Replacement />);
    const firstOpener = screen.getByRole('button', { name: 'First opener' });
    await user.click(firstOpener);
    await user.click(screen.getByRole('button', { name: 'Next dialog' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'First dialog' })).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Đóng' })).toHaveFocus());
    expect(firstOpener).not.toHaveFocus();
  });


});
