import { checkPassword, isStrongPassword } from './password';

describe('password validator', () => {
  it('rechaza contraseñas cortas', () => {
    expect(checkPassword('Ab1!').minLength).toBeFalse();
    expect(isStrongPassword('Ab1!')).toBeFalse();
  });

  it('exige minúscula, mayúscula y símbolo', () => {
    expect(isStrongPassword('solominusculas1!')).toBeFalse();
    expect(isStrongPassword('SOLOMAYUSCULAS1!')).toBeFalse();
    expect(isStrongPassword('SinSimbolo123')).toBeFalse();
    expect(isStrongPassword('Cumple123!')).toBeTrue();
  });

  it('acepta símbolos distintos de los obvios', () => {
    expect(isStrongPassword('BuenaClave#')).toBeTrue();
    expect(isStrongPassword('OtraClave2026$')).toBeTrue();
  });
});
