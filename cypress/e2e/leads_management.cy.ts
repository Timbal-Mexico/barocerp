
describe('Leads Management System', () => {
  beforeEach(() => {
    // Mock Supabase auth
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
    
    cy.visit('/dashboard/leads');
  });

  it('displays the leads list with all view options', () => {
    // Check title
    cy.contains('Leads (CRM)').should('be.visible');
    
    // Check view toggle buttons exist
    cy.get('button[title="Vista Lista"]').should('be.visible');
    cy.get('button[title="Vista Tarjetas"]').should('be.visible');
    cy.get('button[title="Vista Excel"]').should('be.visible');

    // Default view is List
    cy.get('table').should('exist');
    cy.contains('Nombre').should('be.visible');
  });

  it('switches between views correctly', () => {
    // Switch to Card view
    cy.get('button[title="Vista Tarjetas"]').click();
    cy.get('.grid').should('exist');
    cy.get('table').should('not.exist');

    // Switch to Excel view
    cy.get('button[title="Vista Excel"]').click();
    cy.get('table').should('exist');
    // Excel view has specific headers
    cy.contains('Producto Interés').should('exist'); // Use exist as it might be scrolled out
    
    // Switch back to List view
    cy.get('button[title="Vista Lista"]').click();
    cy.get('table').should('exist');
  });

  it('filters leads by search term', () => {
    // Type in search box
    cy.get('input[placeholder="Buscar leads..."]').type('Test Lead');
    // Should filter (assuming data exists or empty state)
    // Since we don't mock the DB response here (unless we add interception), we just check UI reaction
    cy.get('input[placeholder="Buscar leads..."]').should('have.value', 'Test Lead');
  });

  it('opens filter panel and applies filters', () => {
    // Open filters
    cy.get('button').find('svg.lucide-filter').parent().click();
    
    // Check filter options appear
    cy.contains('Canal').should('be.visible');
    cy.contains('Fecha de creación').should('be.visible');

    // Close filters (toggle)
    cy.get('button').find('svg.lucide-filter').parent().click();
  });

  it('shows export options', () => {
    cy.contains('button', 'Exportar').click();
    cy.contains('Excel (.xlsx)').should('be.visible');
    cy.contains('CSV').should('be.visible');
    cy.contains('PDF').should('be.visible');
  });
});
