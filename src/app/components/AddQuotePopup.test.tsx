// This file is currently not being used for tests
// TODO: Implement tests for AddQuotePopup component 

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AddQuotePopup from './AddQuotePopup';

describe('AddQuotePopup', () => {
  const mockOnAdd = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    // Clear mock function calls before each test
    mockOnAdd.mockClear();
    mockOnClose.mockClear();
  });

  it('renders all form fields', () => {
    render(<AddQuotePopup onAdd={mockOnAdd} onClose={mockOnClose} />);
    
    // Use more specific label text to avoid ambiguity
    expect(screen.getByLabelText(/^author$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^quote text$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^subjects/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^author link$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^video link$/i)).toBeInTheDocument();
  });

  it('calls onClose when cancel button is clicked', () => {
    render(<AddQuotePopup onAdd={mockOnAdd} onClose={mockOnClose} />);
    
    const cancelButton = screen.getByText(/cancel/i);
    fireEvent.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('validates required fields before submission', () => {
    render(<AddQuotePopup onAdd={mockOnAdd} onClose={mockOnClose} />);
    
    const submitButton = screen.getByText(/add quote/i);
    fireEvent.click(submitButton);
    
    // Should show error messages for required fields
    expect(screen.getByText(/author is required/i)).toBeInTheDocument();
    expect(screen.getByText(/quote text is required/i)).toBeInTheDocument();
    expect(screen.getByText(/at least one subject is required/i)).toBeInTheDocument();
    
    // onAdd should not be called if validation fails
    expect(mockOnAdd).not.toHaveBeenCalled();
  });

  it('successfully submits when all required fields are filled', () => {
    render(<AddQuotePopup onAdd={mockOnAdd} onClose={mockOnClose} />);
    
    // Fill in required fields using more specific selectors
    fireEvent.change(screen.getByLabelText(/^author$/i), {
      target: { value: 'Test Author' }
    });
    fireEvent.change(screen.getByLabelText(/^quote text$/i), {
      target: { value: 'Test Quote' }
    });
    fireEvent.change(screen.getByLabelText(/^subjects/i), {
      target: { value: 'test, example' }
    });
    
    const submitButton = screen.getByText(/add quote/i);
    fireEvent.click(submitButton);
    
    // onAdd should be called with the correct data
    expect(mockOnAdd).toHaveBeenCalledTimes(1);
    expect(mockOnAdd).toHaveBeenCalledWith({
      author: 'Test Author',
      quoteText: 'Test Quote',
      subjects: ['test', 'example'],
      authorLink: '',
      videoLink: '',
      contributedBy: ''
    });
  });
}); 