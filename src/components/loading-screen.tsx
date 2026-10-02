import { ParkingMark } from './brand/logo';
import { WaveLoader } from './wave-loader';

/**
 * Pantalla de carga. Un solo protagonista al centro: el auto llega, espera, la barrera sube (la
 * luz pasa de roja a verde) y sigue. La marca va arriba y la ola de progreso abajo, al mismo ritmo
 * de 4 s que el auto. Estilos en globals.css (.gm-loader y .gm-escena).
 */
export function LoadingScreen() {
  return (
    <div className="gm-loader" role="status">
      <div className="gm-loader__marca" aria-hidden="true">
        <ParkingMark size="md" />
        <span>ESTACIONAMIENTO</span>
      </div>

      <div className="gm-loader__centro" aria-hidden="true">
        <div className="gm-escena">
          <span className="gm-escena__suelo" />
          <span className="gm-escena__carril" />
          <span className="gm-escena__poste" />
          <span className="gm-escena__luz" />

          <div className="gm-escena__auto">
            <span className="gm-escena__sombra" />
            <svg width="120" height="44" viewBox="0 0 120 44">
              <defs>
                <linearGradient id="gm-auto-pintura" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#ffd23f" />
                  <stop offset="0.45" stopColor="#f5a623" />
                  <stop offset="1" stopColor="#e64d1e" />
                </linearGradient>
                <linearGradient id="gm-auto-brillo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#ffffff" stopOpacity="0.45" />
                  <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M6 33C6 28.5 8.2 26.3 13 25.6L30 23.4C35 17 41 12.3 50 11.2L74 11C81 11 86 13.8 91 19L97 24L110 25.9C114 26.5 116 28.6 116 32V34.5C116 35.4 115.3 36 114.4 36H7.6C6.7 36 6 35.4 6 34.5Z"
                fill="url(#gm-auto-pintura)"
              />
              <path d="M30 23.4C35 17 41 12.3 50 11.2L74 11C81 11 86 13.8 91 19L95 22.4C80 21 50 21 30 23.4Z" fill="url(#gm-auto-brillo)" />
              <path d="M6.6 32.2H115.4V34.5C115.4 35.4 114.8 36 114 36H8C7.2 36 6.6 35.4 6.6 34.5Z" fill="#b83a14" opacity="0.45" />
              <path d="M14 26.6L109 27.2" stroke="#fff3c4" strokeOpacity="0.5" strokeWidth="0.8" strokeLinecap="round" />
              <path d="M38.5 23L48 15.2C50 13.9 52.2 13.4 55 13.4H62V23Z" fill="#2a241d" />
              <path d="M65 13.4H74C79 13.4 82.8 15.4 86 19L89.4 23H65Z" fill="#2a241d" />
              <rect x="108.5" y="27" width="6" height="3" rx="1.5" fill="#fff1b8" />
              <rect x="6.5" y="27.5" width="4" height="3" rx="1.5" fill="#a32a10" />
              {/* Los pasarruedas son círculos del color del fondo: «recortan» la carrocería. */}
              <circle cx="31" cy="36" r="9.5" fill="#15120f" />
              <circle cx="91" cy="36" r="9.5" fill="#15120f" />
              <circle cx="31" cy="36" r="7" fill="#2a241d" stroke="#53493c" strokeWidth="2" />
              <circle cx="91" cy="36" r="7" fill="#2a241d" stroke="#53493c" strokeWidth="2" />
              <circle cx="31" cy="36" r="2" fill="#a59b8d" />
              <circle cx="91" cy="36" r="2" fill="#a59b8d" />
            </svg>
            <span className="gm-escena__faro" />
          </div>

          <span className="gm-escena__brazo" />
          <span className="gm-escena__eje" />
        </div>
      </div>

      <div className="gm-loader__pie">
        <WaveLoader />
        <span>Cargando el sistema</span>
      </div>
    </div>
  );
}
