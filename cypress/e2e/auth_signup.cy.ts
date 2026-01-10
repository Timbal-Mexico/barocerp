describe('Auth Signup', () => {
  it('renders signup inputs and submit button', () => {
    cy.visit('/auth/signup');
    cy.get('input#email').should('be.visible').and('have.attr', 'type', 'email');
    cy.get('input#password').should('be.visible').and('have.attr', 'type', 'password');
    cy.contains('button', 'Registrarse').should('be.visible');
  });
});
