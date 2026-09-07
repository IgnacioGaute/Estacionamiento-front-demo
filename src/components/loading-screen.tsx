export function LoadingScreen() {
  return (
    <div className="gm-loader">
      <div className="gm-loader__center">
        {/* Barrier animation */}
        <div className="gm-barrier" aria-hidden="true">
          <div className="gm-barrier__ground" />
          <div className="gm-barrier__post">
            <span className="gm-barrier__light" />
          </div>
          <div className="gm-barrier__arm">
            <span className="gm-barrier__arm-cap" />
          </div>
          <div className="gm-car">
            <span className="gm-car__body" />
            <span className="gm-car__cabin" />
            <span className="gm-car__wheel gm-car__wheel--f" />
            <span className="gm-car__wheel gm-car__wheel--r" />
            <span className="gm-car__light" />
          </div>
        </div>

        {/* Logo */}
        <div className="gm-loader__logo">
          <span className="gm-display text-4xl font-bold text-foreground">ESTACI</span>
          <span className="gm-display text-[34px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-gm-yellow to-gm-orange whitespace-nowrap">
            ONAMIENTO
          </span>
        </div>

        {/* Status */}
        <div className="gm-loader__status">
          <span className="gm-loader__dot" />
          ABRIENDO BARRERA · CARGANDO SISTEMA
        </div>
      </div>

      <div className="gm-loader__foot"></div>
    </div>
  );
}
