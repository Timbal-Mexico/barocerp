describe('Dashboard Goals Chart Views', () => {
  beforeEach(() => {
    window.localStorage.setItem(
      'sb-uytgqwonxbbviwxrdzfd-auth-token',
      JSON.stringify({
        access_token: 'mock-token',
        refresh_token: 'mock-refresh-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        expires_in: 3600,
        token_type: 'bearer',
        user: {
          id: 'mock-user-id',
          email: 'test@example.com',
          aud: 'authenticated',
          role: 'authenticated',
        },
      }),
    );
  });

  it('shows current month summary and day/week/month/year filters', () => {
    cy.visit('/dashboard/goals');

    cy.contains('Resumen del Mes Actual').should('be.visible');

    cy.contains('button', 'Día').should('be.visible');
    cy.contains('button', 'Semana').should('be.visible');
    cy.contains('button', 'Mes').should('be.visible');
    cy.contains('button', 'Año').should('be.visible');

    cy.contains('button', 'Semana').click();
    cy.contains('button', 'Semana').should('have.attr', 'data-state', 'on');

    cy.contains('button', 'Mes').click();
    cy.contains('button', 'Mes').should('have.attr', 'data-state', 'on');
  });
});

