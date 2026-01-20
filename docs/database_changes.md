# Cambios en el Esquema de Base de Datos - 19/01/2026

## Actualización de User Profiles

Se han realizado modificaciones para permitir la actualización de perfiles de usuario y mejorar la auditoría.

### Migración: 20260119120000_allow_profile_updates_and_audit.sql

1.  **Eliminación de Restricciones**:
    *   Se eliminó el trigger `trg_prevent_user_profile_name_change` y la función asociada `prevent_user_profile_name_change`.
    *   **Motivo**: Permitir a los usuarios actualizar su nombre y apellido desde la configuración del perfil, según requerimiento de negocio.

2.  **Auditoría**:
    *   Se agregó el trigger `audit_user_profiles` a la tabla `public.user_profiles`.
    *   **Acción**: Ejecuta la función `audit_trigger_function()` en eventos `INSERT`, `UPDATE` y `DELETE`.
    *   **Resultado**: Los cambios en los perfiles de usuario se registran automáticamente en la tabla `audit_logs`, incluyendo valores anteriores y nuevos.

### Impacto en la Aplicación

*   **Settings Page**: Ahora permite editar Nombre, Apellido y Correo Electrónico.
*   **Integridad de Datos**: Se mantienen las restricciones de unicidad de correo y formato (regex) en la base de datos.
*   **Seguridad**: Las actualizaciones de correo electrónico requieren confirmación a través del flujo de autenticación de Supabase (`supabase.auth.updateUser`), y se reflejan en el perfil público.
