describe('Auth Login Failure', () => {
  it('shows error message on invalid credentials', () => {
    cy.intercept('POST', '**/auth/v1/token*', {
      statusCode: 401,
      body: { error: 'invalid_grant', error_description: 'Invalid login credentials' },
    }).as('login');

    cy.visit('/auth/login');
    cy.get('input#email').type('user@example.com');
    cy.get('input#password').type('wrongpassword');
    cy.contains('button', 'Iniciar sesión').click();

    cy.wait('@login');
    cy.contains(/Error al iniciar sesión|Invalid login credentials/).should('be.visible');
  });
});
