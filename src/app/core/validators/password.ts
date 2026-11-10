/**
 * Reglas de contraseña de LANË (se piden en el registro).
 *
 * Mínimo 8 caracteres, al menos una minúscula, una mayúscula y un símbolo.
 * Se validan tanto en la UI (checklist en vivo) como en AuthService, para que
 * el formulario nunca dependa solo del HTML.
 */
export const PASSWORD_MIN_LENGTH = 8;

export interface PasswordChecks {
  minLength: boolean;
  lowercase: boolean;
  uppercase: boolean;
  symbol: boolean;
}

export function checkPassword(value: string): PasswordChecks {
  return {
    minLength: value.length >= PASSWORD_MIN_LENGTH,
    lowercase: /[a-z]/.test(value),
    uppercase: /[A-Z]/.test(value),
    symbol: /[^A-Za-z0-9]/.test(value)
  };
}

export function isStrongPassword(value: string): boolean {
  const checks = checkPassword(value);
  return checks.minLength && checks.lowercase && checks.uppercase && checks.symbol;
}

export function passwordErrorMessage(): string {
  return 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un símbolo.';
}
