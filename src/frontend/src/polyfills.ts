import { Buffer } from 'buffer';

declare global {
  interface Window {
    global: any;
    Buffer: typeof Buffer;
  }
}

window.global = window;
window.Buffer = Buffer;

export {}; 