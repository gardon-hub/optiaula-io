import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './estilos/index.css';
import { App } from './App';

const contenedor = document.getElementById('raiz');
if (contenedor === null) throw new Error('No se encontró el elemento raíz de la aplicación.');

createRoot(contenedor).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
