import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App.jsx';
import { localStore } from './store.js';
import { can } from './access.js';

const as = me => ({ ...localStore(), mode: 'firebase', me, subscribeMeta: cb => { cb({}); return () => {}; } });

describe('roles in Inventory', () => {
  it('reads the access Parade HQ worked out from roles, else the old duty', () => {
    expect(can({ duty: 'owner' }, 'invSheet')).toBe(true);
    expect(can({ duty: 'member', write: ['inv'] }, 'inv')).toBe(true);
    expect(can({ duty: 'member', write: ['inv'] }, 'invImport')).toBe(false);
    expect(can({ duty: 'uni', write: [] }, 'inv')).toBe(false); // roles override the duty
    expect(can({ duty: 'uni' }, 'invImport')).toBe(true);
    expect(can({ duty: 'commander' }, 'invImport')).toBe(false);
    expect(can(null, 'inv')).toBe(false);
  });
  it('See only: the list shows, but no adding, editing, deleting or importing', () => {
    render(<App store={as({ duty: 'member', read: ['inv'], write: [] })} />);
    expect(screen.getByText(/View only\./)).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Add an item' })).toBeNull();
    expect(screen.queryAllByRole('button', { name: /^Edit / })).toHaveLength(0);
    expect(screen.queryAllByRole('button', { name: /^Delete / })).toHaveLength(0);
    expect(screen.queryByRole('button', { name: /Import CSV/ })).toBeNull();
    expect(screen.getAllByRole('row').length).toBeGreaterThan(1);
  });
  it('Change: adds and edits, but Import CSV needs Change + import', () => {
    render(<App store={as({ duty: 'member', read: ['inv'], write: ['inv'] })} />);
    expect(screen.getByRole('heading', { name: 'Add an item' })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /^Edit / }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Import CSV/ })).toBeNull();
  });
  it('Change + import shows Import CSV', () => {
    render(<App store={as({ duty: 'member', read: ['inv', 'invImport'], write: ['inv', 'invImport'] })} />);
    expect(screen.getByRole('button', { name: /Import CSV/ })).toBeTruthy();
  });
});
