import { io, type Socket } from 'socket.io-client';

// Solo vive en la memoria de esta pestaña. Token y playa separan las suscripciones; la última
// que se desmonta cierra la conexión, también al cambiar de cuenta o de permisos.
const connections = new Map<string, { socket: Socket; users: number }>();
export function subscribeTenantEvent(token: string, playaId: string, event: string, handler: (data: any) => void, onConnect: () => void) {
  const key = JSON.stringify([token, playaId]);
  let connection = connections.get(key);
  if (!connection) {
    connection = { socket: io(process.env.NEXT_PUBLIC_API_URL, { autoConnect: false, transports: ['websocket'], auth: { token, playaId } }), users: 0 };
    connections.set(key, connection);
  }
  connection.users++;
  const { socket } = connection;
  socket.on(event, handler);
  socket.on('connect', onConnect);
  if (socket.connected) onConnect();
  else if (connection.users === 1) socket.connect();
  return () => {
    socket.off(event, handler);
    socket.off('connect', onConnect);
    if (--connection.users === 0) { socket.disconnect(); connections.delete(key); }
  };
}
