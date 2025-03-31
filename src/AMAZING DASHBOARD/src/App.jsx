import React from 'react';
import { createGlobalStyle } from 'styled-components';
import AmazingDashboard from './components/AmazingDashboard';

// Global styles
const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;
    padding: 0;
    font-family: 'Roboto', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background-color: #121212;
    color: #f0f0f0;
  }

  * {
    box-sizing: border-box;
  }

  a {
    text-decoration: none;
    color: inherit;
  }
`;

const App = () => {
  return (
    <>
      <GlobalStyle />
      <AmazingDashboard />
    </>
  );
};

export default App; 