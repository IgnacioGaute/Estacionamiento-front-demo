import { ConfigCargando } from './cargando';

// Al pasar de una opción a otra sólo carga el contenido: el título y la fila de páginas del layout
// quedan en su lugar. Cada opción tiene su propio esqueleto; este es para las que no.
export default function Loading() {
  return <ConfigCargando />;
}
