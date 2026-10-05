import { diferencia, nitidez, zonaDeLaGuia } from './plate-frame';
import { looksLikeKnownPlateFormat } from './plate.utils';

// Franjas verticales de 4 px: un "texto" de alto contraste, y la misma imagen corrida 2 px.
function franjas(ancho: number, alto: number, corrimiento = 0, contraste = 200): Float32Array {
  const gris = new Float32Array(ancho * alto);
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) gris[y * ancho + x] = Math.floor((x + corrimiento) / 4) % 2 ? contraste : 0;
  }
  return gris;
}

describe('medidas del escáner de patentes', () => {
  it('una superficie lisa no tiene nitidez y una con caracteres sí', () => {
    expect(nitidez(new Float32Array(160 * 54).fill(120), 160)).toBe(0);
    expect(nitidez(franjas(160, 54), 160)).toBeGreaterThan(40);
    expect(nitidez(franjas(160, 54, 0, 20), 160)).toBeLessThan(nitidez(franjas(160, 54), 160));
  });

  it('la misma escena no cambia y una corrida sí', () => {
    const base = franjas(160, 54);
    expect(diferencia(base, franjas(160, 54))).toBe(0);
    expect(diferencia(base, franjas(160, 54, 2))).toBeGreaterThan(0);
  });

  it('la zona analizada es la que se ve dentro de la guía', () => {
    // Video vertical 1080x1920 en un visor 3:4: se ve todo el ancho; la guía toma el 78 %.
    const vertical = zonaDeLaGuia(1080, 1920, 3 / 4, 0.78);
    expect(vertical.ancho).toBeCloseTo(842.4);
    expect(vertical.alto).toBeCloseTo(280.8);
    expect(vertical.x).toBeCloseTo(118.8);
    expect(vertical.y).toBeCloseTo(819.6);
    // Video horizontal 1920x1080: el visor recorta los costados y solo se ven 810 px de ancho.
    const zona = zonaDeLaGuia(1920, 1080, 3 / 4, 0.78);
    expect(zona.ancho).toBeCloseTo(810 * 0.78);
    expect(zona.x + zona.ancho / 2).toBeCloseTo(960);
  });
});

describe('formatos de patente argentinos', () => {
  it.each(['ABC123', 'AB123CD', '123ABC', 'A123BCD', 'ab 123 cd', 'a-123-bcd'])('acepta %s', (patente) => {
    expect(looksLikeKnownPlateFormat(patente)).toBe(true);
  });

  it.each(['AB12CD', 'ABCD123', '1234567', 'A12BCD', ''])('rechaza %s', (patente) => {
    expect(looksLikeKnownPlateFormat(patente)).toBe(false);
  });
});
