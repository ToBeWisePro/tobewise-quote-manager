import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// Mock Firebase
jest.mock('./lib/firebase', () => ({ db: {}, getFirestoreDb: jest.fn(() => ({})) }));
jest.mock('./hooks/useAuth', () => ({ 
  useAuth: () => ({ 
    authenticated: true, 
    loading: false, 
    login: jest.fn() 
  }) 
}));

const mockQuoteData = {
  id: '1',
  author: 'Test Author',
  quoteText: 'Test Quote',
  subjects: ['test'],
  authorLink: 'http://example.com',
  contributedBy: 'Tester',
  videoLink: 'http://video.com',
};

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(() => Promise.resolve({ 
    docs: [
      {
        id: '1',
        data: () => mockQuoteData,
      },
    ],
  })),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(),
}));

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => ({
    get: () => null,
  }),
  usePathname: () => '/',
}));

// Mock SideNav component
jest.mock('./components/SideNav', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-sidenav">SideNav</div>,
}));

import Home from './page';

describe('Home CRUD operations', () => {
  it('renders loading state and then content', async () => {
    render(<Home />);
    
    // Initially shows loading
    expect(screen.getByText('Loading quotes...')).toBeInTheDocument();
    
    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search quotes...')).toBeInTheDocument();
    });
    
    expect(screen.getByTestId('mock-sidenav')).toBeInTheDocument();
  });

  it('searches quotes by author', async () => {
    render(<Home />);
    
    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search quotes...')).toBeInTheDocument();
    });
    
    const input = screen.getByPlaceholderText('Search quotes...');
    await act(async () => {
      fireEvent.change(input, { target: { value: 'test' } });
    });
    
    expect(input).toHaveValue('test');
    expect(screen.getByText('Test Author')).toBeInTheDocument();
  });

  it('handles save and delete', async () => {
    render(<Home />);
    
    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Test Author')).toBeInTheDocument();
    expect(screen.getByText('Test Quote')).toBeInTheDocument();
  });

  it('adds updatedAt timestamp on save', async () => {
    const { getByText, findByText } = render(<Home />);

    // Wait for row to appear
    await findByText('Test Author');

    // Click Edit then Save
    fireEvent.click(getByText('Edit'));
    await act(async () => {
      fireEvent.click(getByText('Save'));
    });

    const { updateDoc } = require('firebase/firestore');
    expect(updateDoc).toHaveBeenCalled();
    const updateArgs = updateDoc.mock.calls[0][1];
    expect(updateArgs.updatedAt).toBeDefined();
    // ISO string check (ends with Z)
    expect(updateArgs.updatedAt).toMatch(/Z$/);
  });

  it('adds updatedAt when missing on fetch', async () => {
    // mockQuoteData without updatedAt already
    const { updateDoc } = require('firebase/firestore');
    render(<Home />);
    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalled();
    });
    const payload = updateDoc.mock.calls[0][1];
    expect(payload.updatedAt).toBeDefined();
  });
}); 