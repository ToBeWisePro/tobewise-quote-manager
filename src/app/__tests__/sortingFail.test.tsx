import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock data with two authors out of order
const doc1 = {
  id: '1',
  data: () => ({
    id: '1',
    author: 'Zeta Author',
    quoteText: 'Quote Z',
    subjects: ['test'],
  }),
};
const doc2 = {
  id: '2',
  data: () => ({
    id: '2',
    author: 'Alpha Author',
    quoteText: 'Quote A',
    subjects: ['test'],
  }),
};

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(() => Promise.resolve({ docs: [doc1, doc2] })),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(),
}));

jest.mock('../lib/firebase', () => ({ db: {} }));

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ authenticated: true, loading: false, login: jest.fn() }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
  useSearchParams: () => ({ get: () => null }),
  usePathname: () => '/',
}));

jest.mock('../components/SideNav', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-sidenav" />,
}));

import Home from '../page';

describe('Table sorting integration (expected to fail until implemented)', () => {
  it('reorders rows when clicking the Author header', async () => {
    render(<Home />);

    // Wait for rows to render
    await waitFor(() => {
      expect(screen.getAllByRole('row').length).toBeGreaterThan(2);
    });

    const getFirstAuthor = () => screen.getAllByRole('row')[1].textContent ?? '';

    const initialFirst = getFirstAuthor();

    // Click the Author header
    const authorHeader = screen.getByRole('columnheader', { name: /^Author$/i });
    fireEvent.click(authorHeader); // first click -> ascending (same as initial)
    fireEvent.click(authorHeader); // second click -> descending

    await waitFor(() => {
      expect(getFirstAuthor()).not.toBe(initialFirst);
    });
  });
});
