describe('Not Found', () => {
  it('returns 404 for non-existent route', () => {
    cy.request({ url: '/this-route-does-not-exist', failOnStatusCode: false }).then((resp) => {
      expect(resp.status).to.eq(404);
    });
  });
});

