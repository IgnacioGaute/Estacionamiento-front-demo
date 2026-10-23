// Modelos comunes en Argentina, como sugerencia al cargar el modelo de un vehículo (playa
// gratuita). Es una referencia propia, no un servicio externo: carga sin conexión y al instante.
// Se puede escribir cualquier otro; la lista solo ayuda a poner el nombre exacto.
//
// La búsqueda recorre todo el catálogo, pero ordena primero la clase del tipo elegido: con
// «Auto» elegido, «hilux» igual encuentra la camioneta. Los tipos son configurables por playa:
// uno propio sin clase conocida busca en todo sin prioridad.

export type ClaseVehiculo = 'auto' | 'camioneta' | 'moto';

export type ModeloVehiculo = { marca: string; modelo: string; nombre: string; clase: ClaseVehiculo };

type Catalogo = Record<string, string[]>;

const AUTOS: Catalogo = {
  'Alfa Romeo': ['147', '156', '159', 'Giulietta', 'MiTo'],
  Audi: ['A1', 'A3', 'A4', 'A5', 'A6', 'TT'],
  BMW: ['Serie 1', 'Serie 2', 'Serie 3', 'Serie 4', 'Serie 5', '118i', '120i', '320i', '330i'],
  BYD: ['Dolphin', 'Dolphin Mini', 'Seal'],
  Chery: ['QQ', 'Fulwin', 'Arrizo 5'],
  Chevrolet: ['Agile', 'Astra', 'Aveo', 'Camaro', 'Celta', 'Chevette', 'Classic', 'Cobalt', 'Corsa', 'Corsa Classic', 'Cruze', 'Joy', 'Malibu', 'Meriva', 'Monza', 'Onix', 'Onix Plus', 'Prisma', 'Sonic', 'Vectra', 'Zafira'],
  Citroën: ['2CV', 'AX', 'C3', 'C3 Picasso', 'C4', 'C4 Lounge', 'C4 Picasso', 'C5', 'C-Elysée', 'DS3', 'Saxo', 'Xsara', 'Xsara Picasso'],
  Fiat: ['128', '147', '600', 'Argo', 'Bravo', 'Cronos', 'Duna', 'Grand Siena', 'Idea', 'Linea', 'Mobi', 'Palio', 'Palio Weekend', 'Punto', 'Regatta', 'Siena', 'Stilo', 'Tipo', 'Uno', 'Uno Way'],
  Ford: ['Escort', 'Falcon', 'Fiesta', 'Fiesta Kinetic', 'Focus', 'Fusion', 'Ka', 'Ka+', 'Mondeo', 'Mustang', 'Orion', 'Sierra', 'Taunus'],
  Honda: ['Accord', 'City', 'Civic', 'Fit'],
  Hyundai: ['Accent', 'Elantra', 'i10', 'i30', 'Veloster'],
  Kia: ['Cerato', 'Picanto', 'Rio', 'Soul'],
  Mazda: ['3', '6', 'MX-5'],
  'Mercedes-Benz': ['Clase A', 'Clase B', 'Clase C', 'Clase E', 'CLA'],
  Mini: ['Cooper', 'Cooper S'],
  Mitsubishi: ['Lancer'],
  Nissan: ['Almera', 'Leaf', 'March', 'Note', 'Sentra', 'Tiida', 'Versa'],
  Peugeot: ['106', '205', '206', '207', '207 Compact', '208', '301', '306', '307', '308', '405', '406', '407', '408', '504', '505', '508', 'RCZ'],
  Renault: ['4', '6', '9', '11', '12', '18', '19', '21', 'Clio', 'Clio Mío', 'Fluence', 'Fuego', 'Kwid', 'Laguna', 'Logan', 'Mégane', 'Sandero', 'Sandero Stepway', 'Scénic', 'Symbol', 'Twingo', 'Zoe'],
  Seat: ['Córdoba', 'Ibiza', 'León', 'Toledo'],
  Subaru: ['Impreza', 'Legacy', 'WRX'],
  Suzuki: ['Alto', 'Baleno', 'Celerio', 'Fun', 'Swift'],
  Toyota: ['86', 'Camry', 'Corolla', 'Etios', 'Prius', 'Yaris'],
  Volkswagen: ['Bora', 'CrossFox', 'Escarabajo', 'Fox', 'Gacel', 'Gol', 'Gol Country', 'Gol Trend', 'Golf', 'Jetta', 'Passat', 'Polo', 'Polo Track', 'Scirocco', 'Senda', 'Suran', 'The Beetle', 'Up!', 'Vento', 'Virtus', 'Voyage'],
};

const CAMIONETAS: Catalogo = {
  Audi: ['Q2', 'Q3', 'Q5', 'Q7'],
  BMW: ['X1', 'X3', 'X5', 'X6'],
  BYD: ['Song Pro', 'Yuan Pro'],
  Chery: ['Tiggo 2', 'Tiggo 3', 'Tiggo 4', 'Tiggo 5', 'Tiggo 7', 'Tiggo 8'],
  Chevrolet: ['Blazer', 'C10', 'Captiva', 'Equinox', 'Montana', 'S10', 'Silverado', 'Spin', 'Tracker', 'Trailblazer'],
  Citroën: ['Basalt', 'Berlingo', 'C3 Aircross', 'C4 Cactus', 'C5 Aircross', 'Jumper', 'Jumpy'],
  Dodge: ['Journey'],
  Fiat: ['Doblò', 'Ducato', 'Fastback', 'Fiorino', 'Pulse', 'Strada', 'Titano', 'Toro'],
  Ford: ['Bronco', 'Bronco Sport', 'Courier', 'EcoSport', 'Explorer', 'F-100', 'F-150', 'Kuga', 'Maverick', 'Ranger', 'Ranger Raptor', 'Territory', 'Transit'],
  Haval: ['H6', 'Jolion'],
  Honda: ['CR-V', 'HR-V', 'Pilot', 'WR-V', 'ZR-V'],
  Hyundai: ['Creta', 'H1', 'Kona', 'Santa Fe', 'Staria', 'Tucson'],
  Iveco: ['Daily'],
  Jeep: ['Cherokee', 'Commander', 'Compass', 'Gladiator', 'Grand Cherokee', 'Renegade', 'Wrangler'],
  Kia: ['Carnival', 'Seltos', 'Sonet', 'Sorento', 'Sportage'],
  'Land Rover': ['Defender', 'Discovery', 'Discovery Sport', 'Range Rover', 'Range Rover Evoque'],
  'Mercedes-Benz': ['GLA', 'GLB', 'GLC', 'GLE', 'Sprinter', 'Vito'],
  Mini: ['Countryman'],
  Mitsubishi: ['Eclipse Cross', 'L200', 'Montero', 'Outlander'],
  Nissan: ['Frontier', 'Kicks', 'Murano', 'Pathfinder', 'X-Trail'],
  Peugeot: ['2008', '3008', '5008', 'Boxer', 'Expert', 'Landtrek', 'Partner'],
  Porsche: ['Cayenne', 'Macan'],
  RAM: ['1000', '1500', '2500', 'Rampage'],
  Renault: ['Alaskan', 'Arkana', 'Captur', 'Duster', 'Duster Oroch', 'Kangoo', 'Kardian', 'Koleos', 'Master', 'Trafic'],
  Subaru: ['Crosstrek', 'Forester', 'Outback', 'XV'],
  Suzuki: ['Grand Vitara', 'Jimny', 'S-Cross', 'Vitara'],
  Toyota: ['Corolla Cross', 'Hiace', 'Hilux', 'Land Cruiser', 'RAV4', 'SW4', 'Yaris Cross'],
  Volkswagen: ['Amarok', 'Crafter', 'Nivus', 'Saveiro', 'T-Cross', 'Taos', 'Tera', 'Tiguan', 'Tiguan Allspace', 'Touareg', 'Transporter'],
  Volvo: ['XC40', 'XC60', 'XC90'],
};

const MOTOS: Catalogo = {
  Bajaj: ['Avenger 220', 'Boxer 150', 'Dominar 250', 'Dominar 400', 'Rouser 135', 'Rouser NS 125', 'Rouser NS 160', 'Rouser NS 200', 'Rouser RS 200'],
  Benelli: ['180S', '302S', '502C', '752S', 'Imperiale 400', 'Leoncino 250', 'Leoncino 500', 'TNT 135', 'TNT 15', 'TNT 25', 'TNT 600', 'Tornado 252R', 'TRK 251', 'TRK 502', 'TRK 502X'],
  BMW: ['F 750 GS', 'F 850 GS', 'G 310 GS', 'G 310 R', 'R 1250 GS', 'R 1300 GS', 'S 1000 RR'],
  CFMoto: ['300NK', '450MT', '650MT'],
  Corven: ['Energy 110', 'Hunter 150', 'Indiana 256', 'Mirage 110', 'Triax 150', 'Triax 200', 'Triax 250', 'TXR 250'],
  Ducati: ['Monster', 'Multistrada', 'Panigale', 'Scrambler'],
  Gilera: ['Sahel 150', 'Smash 110', 'SMX 200', 'VC 150', 'YL 200'],
  Guerrero: ['Trip 110'],
  'Harley-Davidson': ['Fat Boy', 'Iron 883', 'Sportster S'],
  Hero: ['Hunk 160R', 'Ignitor 125', 'Xpulse 200'],
  Honda: ['Africa Twin', 'Biz 125', 'CB 125F', 'CB 190R', 'CB 250 Twister', 'CB 300F Twister', 'CB 500F', 'CB 500X', 'CG 150 Titan', 'CG 160 Titan', 'CRF 250F', 'CRF 300L', 'Elite 125', 'Navi 110', 'NC 750X', 'PCX 160', 'Wave 110', 'XR 150L', 'XR 190L', 'XR 250 Tornado', 'XRE 300'],
  Kawasaki: ['KLR 650', 'Ninja 300', 'Ninja 400', 'Versys 300', 'Versys 650', 'Z400', 'Z650', 'Z900'],
  Keller: ['Crono 110', 'Stratus 150'],
  KTM: ['200 Duke', '250 Duke', '390 Adventure', '390 Duke', 'RC 200', 'RC 390'],
  Mondial: ['HD 254', 'LD 110', 'RD 150'],
  Motomel: ['Blitz 110', 'CG 150', 'Custom 150', 'Dlx 110', 'Max 110', 'S2 150', 'Sirius 150', 'Skua 125', 'Skua 150', 'Skua 250', 'Strato Euro 150', 'Victory 150'],
  'Royal Enfield': ['Classic 350', 'Continental GT 650', 'Himalayan 450', 'Hunter 350', 'Interceptor 650', 'Meteor 350', 'Scram 411'],
  Suzuki: ['AX 100', 'EN 125', 'Gixxer 150', 'GN 125', 'V-Strom 250', 'V-Strom 650'],
  TVS: ['Apache RR 310', 'Apache RTR 160', 'Apache RTR 200'],
  Voge: ['300R'],
  Yamaha: ['Crypton 110', 'Fazer 250', 'FZ 25', 'FZ-S 150', 'MT-03', 'MT-07', 'MT-09', 'NMAX 155', 'R15', 'R3', 'Ray ZR 125', 'Ténéré 700', 'XTZ 125', 'XTZ 150', 'XTZ 250', 'YBR 125'],
  Zanella: ['Ceccato 150', 'Due 110', 'Patagonian Eagle 150', 'Patagonian Eagle 250', 'RX 150', 'Sapucai 150', 'ZB 110', 'ZR 150'],
};

const CLASE_POR_TIPO: Record<string, ClaseVehiculo> = {
  AUTO: 'auto',
  CAMIONETA: 'camioneta',
  PICKUP: 'camioneta',
  SUV: 'camioneta',
  UTILITARIO: 'camioneta',
  FURGON: 'camioneta',
  VAN: 'camioneta',
  MOTO: 'moto',
  MOTOCICLETA: 'moto',
};

export const NOMBRE_CLASE: Record<ClaseVehiculo, string> = { auto: 'Auto', camioneta: 'Camioneta', moto: 'Moto' };

const EJEMPLO: Record<ClaseVehiculo, string> = { auto: 'Fiat Cronos', camioneta: 'Toyota Hilux', moto: 'Honda Wave 110' };

// Abreviaturas con las que se suele escribir la marca.
const ALIAS: Record<string, string> = { vw: 'volkswagen', chevy: 'chevrolet', mb: 'mercedes', merce: 'mercedes' };

// Sin acentos ni signos: «Citroën C-Elysée» y «citroen celysee» se comparan igual.
const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const palabrasDe = (texto: string) => normalizar(texto).split(/[^a-z0-9]+/).filter(Boolean);

type Entrada = ModeloVehiculo & { compacto: string; palabras: string[] };

const aplanar = (catalogo: Catalogo, clase: ClaseVehiculo): Entrada[] =>
  Object.entries(catalogo).flatMap(([marca, modelos]) => modelos.map((modelo) => {
    const nombre = `${marca} ${modelo}`;
    const palabras = palabrasDe(nombre);
    return { marca, modelo, nombre, clase, palabras, compacto: palabras.join('') };
  }));

const CATALOGO: Entrada[] = [...aplanar(AUTOS, 'auto'), ...aplanar(CAMIONETAS, 'camioneta'), ...aplanar(MOTOS, 'moto')];

export function claseDeTipo(tipoVehiculo: string | null | undefined): ClaseVehiculo | null {
  return (tipoVehiculo && CLASE_POR_TIPO[tipoVehiculo.toUpperCase()]) || null;
}

export function ejemploModelo(tipoVehiculo: string | null | undefined): string {
  return EJEMPLO[claseDeTipo(tipoVehiculo) ?? 'auto'];
}

const prefijoComun = (a: string, b: string) => {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
};

// Cada palabra buscada suma más si empieza una palabra del modelo («wa» → Wave) que si solo
// aparece adentro («ave» → Wave).
function puntaje(entrada: Entrada, termino: string): number {
  if (entrada.palabras.some((palabra) => palabra.startsWith(termino))) return 3;
  if (entrada.compacto.startsWith(termino)) return 2;
  return entrada.compacto.includes(termino) ? 1 : 0;
}

/**
 * Busca modelos por marca y modelo, en cualquier orden y sin importar acentos o guiones
 * («hrv», «c elysee», «wave honda»). Si nada coincide con todo lo escrito, devuelve los que
 * coinciden en parte (`parecidos`): «benelli 189» ofrece las Benelli, la 180S primero.
 */
export function buscarModelos(texto: string, tipoVehiculo?: string | null, limite = 6): { modelos: ModeloVehiculo[]; parecidos: boolean } {
  const terminos = palabrasDe(texto).map((termino) => ALIAS[termino] ?? termino);
  if (!terminos.length) return { modelos: [], parecidos: false };
  const clase = claseDeTipo(tipoVehiculo);
  const prioridad = (entrada: Entrada) => (clase && entrada.clase === clase ? 1000 : 0);
  const recortar = (lista: { entrada: Entrada; valor: number }[]) => lista
    .sort((a, b) => b.valor - a.valor || a.entrada.nombre.length - b.entrada.nombre.length || a.entrada.nombre.localeCompare(b.entrada.nombre))
    .slice(0, limite)
    .map(({ entrada: { marca, modelo, nombre, clase: suClase } }) => ({ marca, modelo, nombre, clase: suClase }));

  const completos = CATALOGO.flatMap((entrada) => {
    const puntos = terminos.map((termino) => puntaje(entrada, termino));
    return puntos.every(Boolean) ? [{ entrada, valor: prioridad(entrada) + puntos.reduce((a, b) => a + b, 0) }] : [];
  });
  if (completos.length) return { modelos: recortar(completos), parecidos: false };

  // Parecidos: alcanza con una palabra de 3 letras o más; lo que no coincide suma por cuánto
  // se parece al comienzo de alguna palabra (189 ↔ 180s comparten «18»).
  const parciales = CATALOGO.flatMap((entrada) => {
    let coincidencias = 0;
    let cercania = 0;
    for (const termino of terminos) {
      if (termino.length >= 3 && puntaje(entrada, termino)) coincidencias++;
      else cercania += Math.max(0, ...entrada.palabras.map((palabra) => prefijoComun(palabra, termino)));
    }
    return coincidencias ? [{ entrada, valor: prioridad(entrada) + coincidencias * 100 + cercania }] : [];
  });
  return { modelos: recortar(parciales), parecidos: parciales.length > 0 };
}
