describe('Dashboard Auth Guards', () => {
  const protectedPaths = [
    '/dashboard/overview',
    '/dashboard/inventory',
    '/dashboard/leads',
    '/dashboard/sales',
    '/dashboard/users',
    '/dashboard/goals',
    '/dashboard/settings',
  ];

  protectedPaths.forEach((path) => {
    it(`redirects "${path}" to "/auth/login" when unauthenticated`, () => {
      cy.visit(path, { failOnStatusCode: false });
      cy.url().should('include', '/auth/login');
    });
  });
});

