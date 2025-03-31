import React from 'react';
import Dashboard from './components/Dashboard';
import { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background: #000B1E;
    overflow-x: hidden;
    overflow-y: auto;
  }

  @media (max-width: 768px) {
    html, body {
      height: auto;
      width: 100%;
      overflow-x: hidden;
    }
  }
`;

function App() {
  return (
    <>
      <GlobalStyle />
      <Dashboard />
    </>
  );
}

export default App; 