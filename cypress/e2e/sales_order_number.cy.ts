describe('Sales Order Number Logic', () => {
  beforeEach(() => {
    // Mock Supabase auth session
    window.localStorage.setItem('sb-uytgqwonxbbviwxrdzfd-auth-token', JSON.stringify({
      access_token: 'mock-token',
      refresh_token: 'mock-refresh-token',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      expires_in: 3600,
      token_type: 'bearer',
      user: { 
        id: 'mock-user-id', 
        email: 'test@example.com',
        aud: 'authenticated',
        role: 'authenticated'
      }
    }));
  });

  it('displays the correct order number format with prefix BR1940 and validates readonly state', () => {
    // Intercept the RPC call to return a specific sequence number
    // Note: Adjust the URL pattern to match your Supabase project URL
    cy.intercept('POST', '**/rest/v1/rpc/get_next_order_sequence', {
      statusCode: 200,
      body: 105 // Mock sequence number
    }).as('getNextSequence');

    // Visit the sales page
    cy.visit('/dashboard/sales');
    
    // Open the "New Sale" modal
    // Assuming there is a button with text "Nueva Venta" or similar
    cy.contains('button', 'Nueva Venta').click();

    // Wait for the sequence number to be fetched
    cy.wait('@getNextSequence');

    // Verify visual prefix
    cy.contains('span', 'BR1940-').should('be.visible');

    // Verify input value is padded (105 -> 0105)
    cy.get('input#order-number').should('have.value', '0105');
    
    // Verify field is editable (not read-only or disabled)
    cy.get('input#order-number').should('not.have.attr', 'readonly');
    cy.get('input#order-number').should('not.be.disabled');

    // Verify user can manually edit the number (and only numbers)
    cy.get('input#order-number').clear().type('99a99'); // Attempt to type letters
    cy.get('input#order-number').should('have.value', '9999'); // Should only have numbers
  });

  it('handles fallback when sequence is 1', () => {
    cy.intercept('POST', '**/rest/v1/rpc/get_next_order_sequence', {
      statusCode: 200,
      body: 1
    }).as('getNextSequenceOne');

    cy.visit('/dashboard/sales');
    cy.contains('button', 'Nueva Venta').click();
    cy.wait('@getNextSequenceOne');

    cy.get('input#order-number').should('have.value', '0001');
  });
});
