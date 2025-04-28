describe('Quote Manager E2E Tests', () => {
  beforeEach(() => {
    // Login using custom command
    cy.login('your-test-password');
  });

  it('should display quotes and allow searching', () => {
    // Wait for quotes to load
    cy.get('table').should('be.visible');
    
    // Search for a quote
    cy.get('input[placeholder="Search quotes..."]').type('test');
    cy.get('table').contains('td', 'test').should('be.visible');
  });

  it('should allow adding a new quote', () => {
    // Navigate to add quote page
    cy.visit('/add-quote');
    
    // Fill in the form
    cy.get('input[name="author"]').type('Test Author');
    cy.get('textarea[name="quoteText"]').type('This is a test quote');
    cy.get('input[name="subjects"]').type('test,e2e');
    
    // Submit the form
    cy.get('button').contains('Add Quote').click();
    
    // Verify the quote was added
    cy.get('table').contains('td', 'Test Author').should('be.visible');
  });

  it('should allow editing a quote', () => {
    // Find and edit a quote
    cy.get('table').contains('tr', 'Test Author').within(() => {
      cy.get('button').contains('Edit').click();
      cy.get('input').clear().type('Updated Author');
      cy.get('button').contains('Save').click();
    });
    
    // Verify the edit
    cy.get('table').contains('td', 'Updated Author').should('be.visible');
  });

  it('should allow deleting a quote', () => {
    // Find and delete a quote
    cy.get('table').contains('tr', 'Updated Author').within(() => {
      cy.get('button').contains('Delete').click();
    });
    
    // Confirm deletion
    cy.on('window:confirm', () => true);
    
    // Verify the quote was deleted
    cy.get('table').contains('td', 'Updated Author').should('not.exist');
  });
}); 