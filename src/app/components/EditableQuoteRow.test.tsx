import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EditableQuoteRow from './EditableQuoteRow';
import { Quote } from '../types/Quote';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => ({
    get: () => null,
  }),
}));

const mockQuote: Quote = {
  id: '1',
  author: 'Test Author',
  authorLink: 'http://example.com',
  contributedBy: 'Tester',
  quoteText: 'This is a test quote.',
  subjects: ['test', 'unit'],
  videoLink: 'http://video.com',
};

describe('EditableQuoteRow', () => {
  const renderComponent = (showContributedBy = false) => {
    return render(
      <table>
        <tbody>
          <EditableQuoteRow
            quote={mockQuote}
            onSave={jest.fn()}
            onDelete={jest.fn()}
            columnWidths={{ quote: 200, author: 100, authorLink: 100, contributedBy: 100, subjects: 80, videoLink: 80 }}
            showContributedBy={showContributedBy}
          />
        </tbody>
      </table>
    );
  };

  it('renders quote data in view mode', () => {
    renderComponent();
    expect(screen.getByText('Test Author')).toBeInTheDocument();
    expect(screen.getByText('This is a test quote.')).toBeInTheDocument();
  });

  it('hides contributedBy column by default', () => {
    renderComponent();
    expect(screen.queryByText('Tester')).not.toBeInTheDocument();
  });

  it('shows contributedBy column when showContributedBy is true', () => {
    renderComponent(true);
    expect(screen.getByText('Tester')).toBeInTheDocument();
  });

  it('switches to edit mode and allows editing', async () => {
    renderComponent();
    fireEvent.click(screen.getByText('Edit'));
    
    // Now we should see input fields
    const authorInput = screen.getByDisplayValue('Test Author');
    const quoteInput = screen.getByDisplayValue('This is a test quote.');
    
    expect(authorInput).toBeInTheDocument();
    expect(quoteInput).toBeInTheDocument();
  });

  it('shows contributedBy field in edit mode only when showContributedBy is true', () => {
    // First check when showContributedBy is false
    renderComponent(false);
    fireEvent.click(screen.getByText('Edit'));
    expect(screen.queryByDisplayValue('Tester')).not.toBeInTheDocument();

    // Then check when showContributedBy is true
    renderComponent(true);
    fireEvent.click(screen.getByText('Edit'));
    expect(screen.getByDisplayValue('Tester')).toBeInTheDocument();
  });

  it('calls onSave with updated data', async () => {
    const onSave = jest.fn();
    render(
      <table>
        <tbody>
          <EditableQuoteRow
            quote={mockQuote}
            onSave={onSave}
            onDelete={jest.fn()}
            columnWidths={{ quote: 200, author: 100, authorLink: 100, contributedBy: 100, subjects: 80, videoLink: 80 }}
            showContributedBy={true}
          />
        </tbody>
      </table>
    );

    // Enter edit mode
    fireEvent.click(screen.getByText('Edit'));
    
    // Make changes
    fireEvent.change(screen.getByDisplayValue('Test Author'), { target: { value: 'New Author' } });
    fireEvent.click(screen.getByText('Save'));
    
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ author: 'New Author' })));
  });

  it('calls onDelete when delete is clicked', () => {
    const onDelete = jest.fn();
    render(
      <table>
        <tbody>
          <EditableQuoteRow
            quote={mockQuote}
            onSave={jest.fn()}
            onDelete={onDelete}
            columnWidths={{ quote: 200, author: 100, authorLink: 100, contributedBy: 100, subjects: 80, videoLink: 80 }}
            showContributedBy={false}
          />
        </tbody>
      </table>
    );
    fireEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledWith('1');
  });
}); 