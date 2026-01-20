describe('User Profile Update', () => {
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
    
    // Intercept profile load
    cy.intercept('GET', '**/rest/v1/user_profiles*', {
      statusCode: 200,
      body: {
        name: 'John',
        lastname: 'Doe',
        department: 'IT',
        residence_city: 'Mexico City',
        email: 'test@example.com'
      }
    }).as('getProfile');

    cy.visit('/dashboard/settings');
  });

  it('validates email format in settings', () => {
    // Wait for profile to load
    cy.wait('@getProfile');

    // Select the User Profile tab if not already selected
    cy.contains('Perfil de usuario').click();

    // Clear email and type invalid one
    cy.get('input#email').clear().type('invalid-email');
    
    // Try to submit
    cy.contains('button', 'Guardar perfil').click();

    // Check for error toast or message
    // Note: Toaster might be rendered in a specific way.
    // Assuming sonner toast displays text in the document.
    cy.contains('Formato de correo electrónico inválido').should('be.visible');
  });

  it('updates profile successfully when inputs are valid', () => {
    cy.wait('@getProfile');

    // Intercept update call
    cy.intercept('POST', '**/rest/v1/user_profiles*', {
      statusCode: 200,
      body: {}
    }).as('updateProfile');

    // Intercept auth update
    cy.intercept('PUT', '**/auth/v1/user*', {
      statusCode: 200,
      body: {
        user: {
          id: 'mock-user-id',
          email: 'newemail@example.com',
          new_email: 'newemail@example.com'
        }
      }
    }).as('updateAuth');

    // Change Name
    cy.get('input#name').clear().type('Jane');
    
    // Change Email
    cy.get('input#email').clear().type('newemail@example.com');

    // Submit
    cy.contains('button', 'Guardar perfil').click();

    // Verify calls
    cy.wait('@updateAuth');
    // Note: Depending on logic, it might wait for auth before profile or vice versa
    // In our code: Auth first, then Profile.
    
    // Verify toast success
    cy.contains('Perfil actualizado correctamente').should('be.visible');
    cy.contains('Se ha enviado un correo de confirmación').should('be.visible');
  });

  it('handles unique email constraint error', () => {
    cy.wait('@getProfile');

    // Intercept update call to fail
    cy.intercept('POST', '**/rest/v1/user_profiles*', {
      statusCode: 409,
      body: {
        code: '23505',
        message: 'duplicate key value violates unique constraint "user_profiles_email_key"'
      }
    }).as('updateProfileFail');

    // Stub auth update to succeed (or fail, but let's test DB fail)
    cy.intercept('PUT', '**/auth/v1/user*', {
        statusCode: 200,
        body: {}
    });

    cy.get('input#email').clear().type('existing@example.com');
    cy.contains('button', 'Guardar perfil').click();

    cy.wait('@updateProfileFail');
    cy.contains('El correo electrónico ya está en uso por otro usuario').should('be.visible');
  });
});
