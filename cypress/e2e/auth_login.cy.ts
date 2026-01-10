describe('Auth Login', () => {
  it('redirects "/" to "/auth/login"', () => {
    cy.visit('/');
    cy.url().should('include', '/auth/login');
  });

  it('renders email and password inputs and submit button', () => {
    cy.visit('/auth/login');
    cy.get('input#email').should('be.visible').and('have.attr', 'type', 'email');
    cy.get('input#password').should('be.visible').and('have.attr', 'type', 'password');
    cy.contains('button', 'Iniciar sesión').should('be.visible');
  });
});

