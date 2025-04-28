/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    /**
     * Custom command to log into the application
     * @example cy.login('password123')
     */
    login(password: string): Chainable<Element>
  }
} 