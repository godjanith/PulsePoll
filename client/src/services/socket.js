import { io } from 'socket.io-client';

const SOCKET_SERVER_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

class SocketService {
  constructor() {
    this.socket = null;
    this.subscribers = new Set();
    this.status = 'disconnected';
  }

  getSocket() {
    if (!this.socket) {
      this.socket = io(SOCKET_SERVER_URL, {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 800,
        reconnectionDelayMax: 5000,
        timeout: 10000,
        transports: ['websocket', 'polling'],
      });

      this.socket.on('connect', () => this.notifyStatus('connected'));
      this.socket.on('disconnect', () => this.notifyStatus('disconnected'));
      this.socket.on('connect_error', () => this.notifyStatus('error'));
      this.socket.io.on('reconnect_attempt', () => this.notifyStatus('reconnecting'));
      this.socket.io.on('reconnect', () => this.notifyStatus('connected'));
    }
    return this.socket;
  }

  onStatusChange(callback) {
    this.subscribers.add(callback);
    callback(this.socket?.connected ? 'connected' : this.status);
    return () => this.subscribers.delete(callback);
  }

  notifyStatus(status) {
    this.status = status;
    this.subscribers.forEach((callback) => callback(status));
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.notifyStatus('disconnected');
  }
}

export const socketService = new SocketService();
export default socketService;
