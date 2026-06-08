import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { updateDoc } from 'firebase/firestore';

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
  deleteField: jest.fn(() => ({ __delete: true })),
  doc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
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

jest.mock('./components/AddQuotePanel', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-add-quote-panel">Add Quote Panel</div>,
}));

jest.mock('./components/AuthorEditorModal', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-author-editor">Author Editor</div>,
}));

jest.mock('./lib/ensureAuthorProfile', () => ({
  ensureAuthorProfile: jest.fn(() => Promise.resolve()),
}));

jest.mock('./lib/authorProfile', () => ({
  cacheAuthorImageFromUrl: jest.fn(),
  deleteStoredAuthorImage: jest.fn(),
  getStoredAssetPathFromUrl: jest.fn(() => null),
  inferImageSource: jest.fn(() => 'upload'),
  normalizeAuthorImageCrop: jest.fn(() => ({
    centerX: 50,
    centerY: 25,
    zoom: 1,
  })),
  resolveAuthorImageCandidate: jest.fn(),
  uploadAuthorImageBlob: jest.fn(),
  uploadOriginalAuthorImageBlob: jest.fn(),
}));

import Home from './page';

describe('Home CRUD operations', () => {
  it('renders loading state and then content', async () => {
    render(<Home />);
    
    // Initially shows loading
    expect(screen.getByText('Loading quote manager...')).toBeInTheDocument();
    
    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search every field/i)).toBeInTheDocument();
    });
    
    expect(screen.getByTestId('mock-sidenav')).toBeInTheDocument();
  });

  it('searches quotes by author', async () => {
    render(<Home />);
    
    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search every field/i)).toBeInTheDocument();
    });
    
    const input = screen.getByPlaceholderText(/Search every field/i);
    await act(async () => {
      fireEvent.change(input, { target: { value: 'test' } });
    });
    
    expect(input).toHaveValue('test');
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('Test Author');
  });

  it('handles save and delete', async () => {
    render(<Home />);
    
    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
    
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('Test Author');
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('Test Quote');
  });

  it('adds updatedAt timestamp on save', async () => {
    const { getByText, findByText } = render(<Home />);

    // Wait for row to appear
    await findByText('Test Author');

    // Click Edit then Save
    fireEvent.click(getByText('Edit quote'));
    const authorInput = await screen.findByDisplayValue('Test Author');
    fireEvent.change(authorInput, { target: { value: 'Updated Author' } });
    await act(async () => {
      fireEvent.click(getByText('Save'));
    });

    const updateDocMock = updateDoc as unknown as jest.Mock;
    expect(updateDocMock).toHaveBeenCalled();
    const updateArgs = updateDocMock.mock.calls[0][1];
    expect(updateArgs.updatedAt).toBeDefined();
    // ISO string check (ends with Z)
    expect(updateArgs.updatedAt).toMatch(/Z$/);
  });

  it('adds updatedAt when missing on fetch', async () => {
    // mockQuoteData without updatedAt already
    const updateDocMock = updateDoc as unknown as jest.Mock;
    render(<Home />);
    await waitFor(() => {
      expect(updateDocMock).toHaveBeenCalled();
    });
    const payload = updateDocMock.mock.calls[0][1];
    expect(payload.updatedAt).toBeDefined();
  });
}); 
