export type PlayaResumen = {
  id: string;
  empresaId: string;
  nombre: string;
  direccion: string | null;
};

export type UsuarioDeEmpresa = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  // A qué playas de su empresa tiene acceso. Vacío = todavía no se le asignó ninguna.
  playaIds: string[];
};

export type EmpresaConDetalle = {
  id: string;
  nombre: string;
  estado: 'ACTIVA' | 'SUSPENDIDA' | 'BAJA';
  playas: PlayaResumen[];
  usuarios: UsuarioDeEmpresa[];
  createdAt: string;
  updatedAt: string;
};
