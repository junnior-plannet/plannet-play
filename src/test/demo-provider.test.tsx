import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from '@/components/app/AppShell';
import { useDemo } from '@/components/v2/DemoProvider';

const me = { userId: 'u1', email: 'c@x.com', fullName: 'Cliente Teste', isAdmin: false, clientIds: [] };

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  useNavigate: () => () => {},
  useRouterState: ({ select }: { select: (state: { location: { pathname: string } }) => unknown }) => select({ location: { pathname: '/playlists' } }),
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { signOut: async () => ({}) } } }));
vi.mock('@/lib/auth', () => ({ useMe: () => ({ data: me }) }));

function Probe() {
  const demo = useDemo();
  return <output data-testid="shared-role">{demo.role}</output>;
}

afterEach(cleanup);
describe('AppShell', () => {
  it('mounts demo consumers without an external provider and follows the real account role', () => {
    const qc = new QueryClient();
    render(<QueryClientProvider client={qc}><AppShell><Probe /></AppShell></QueryClientProvider>);
    expect(screen.getByTestId('shared-role').textContent).toBe('client');
    expect(screen.queryByLabelText('Perfil simulado')).toBeNull();
    expect(screen.getByText('Cliente Teste')).toBeTruthy();
  });
});
