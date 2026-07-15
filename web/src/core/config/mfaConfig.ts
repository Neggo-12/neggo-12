/**
 * Interruptor maestro de la exigencia de MFA (TOTP) para Admin y B2B
 * (Banco, Constructora, Comercio). Los clientes B2C nunca pasan por MFA,
 * incluso si este flag está en true.
 *
 * En false (default): todo el código de MFA existe y compila, pero no se
 * ejecuta — la pantalla "Seguridad" no aparece en ningún menú, el login no
 * verifica niveles de garantía, y los guards de ruta no exigen aal2.
 * Comportamiento idéntico al actual, cero riesgo de bloqueo accidental.
 *
 * En true: se activa el flujo completo — enroll TOTP (QR + verificación),
 * el login exige el código si el usuario ya tiene un factor inscrito, y los
 * guards de ruta (RequireAdmin/RequireRole) exigen aal2 además del rol para
 * estos roles.
 */
export const MFA_ENFORCEMENT_ENABLED = false;

/** Roles a los que aplica la exigencia de MFA cuando el flag está en true. */
export const MFA_ENFORCED_ROLES = ['Admin', 'Banco', 'Constructora', 'Comercio'] as const;
