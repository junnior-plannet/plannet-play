import { describe, expect, it, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { canEditReserve, clampReserve } from '@/lib/api';

describe('Reserva Plannet', () => {
  it('somente o administrador pode editar a reserva', () => {
    expect(canEditReserve(true)).toBe(true);
    expect(canEditReserve(false)).toBe(false);
  });
  it('fica entre 0% e 100%', () => {
    expect(clampReserve(150)).toBe(100);
    expect(clampReserve(-5)).toBe(0);
    expect(clampReserve(25)).toBe(25);
  });
});
