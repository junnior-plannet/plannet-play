import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from '@/components/app/AppShell';
import { useDemo } from '@/components/v2/DemoProvider';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  useRouterState: ({ select }: { select: (state: { location: { pathname: string } }) => unknown }) => select({ location: { pathname: '/playlists' } }),
}));

function Probe() {
  const demo = useDemo();
  return <output data-testid="shared-role">{demo.role}</output>;
}

afterEach(cleanup);
describe('AppShell demo boundary', () => {
  it('mounts consumers without an external provider and shares profile state', () => {
    const app = render(<AppShell><Probe /></AppShell>);
    expect(screen.getByTestId('shared-role').textContent).toBe('admin');
    fireEvent.change(screen.getByLabelText('Perfil simulado'), { target: { value: 'client' } });
    expect(screen.getByTestId('shared-role').textContent).toBe('client');
    app.rerender(<AppShell><Probe /></AppShell>);
    expect(screen.getByTestId('shared-role').textContent).toBe('client');
  });
});