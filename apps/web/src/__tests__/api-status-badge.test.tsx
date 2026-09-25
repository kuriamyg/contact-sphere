import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ApiStatusBadge } from '@/components/api-status-badge';

describe('ApiStatusBadge', () => {
  it.each([
    ['online', /online/i],
    ['offline', /unreachable/i],
    ['not-configured', /not configured/i],
  ] as const)('describes %s in words, not colour alone', (status, text) => {
    render(<ApiStatusBadge status={status} />);
    expect(screen.getByText(text)).toBeInTheDocument();
  });
});
