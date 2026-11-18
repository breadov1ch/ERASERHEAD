import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { productReducer } from './store/productReducer';

// Suppress third-party Chrome extension errors (like Urban VPN chrome-extension://... M_ID) from popping React Error Overlay
if (typeof window !== "undefined") {
  const isExtensionError = (e) => {
    const filename = e?.filename || "";
    const message = e?.message || "";
    const stack = e?.error?.stack || e?.reason?.stack || "";
    return (
      filename.includes("chrome-extension://") ||
      stack.includes("chrome-extension://") ||
      message.includes("M_ID") ||
      message.includes("Cannot read properties of undefined (reading 'M_ID')")
    );
  };

  window.addEventListener("error", (event) => {
    if (isExtensionError(event)) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  }, true);

  window.addEventListener("unhandledrejection", (event) => {
    if (isExtensionError(event)) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  }, true);
}


const rootReducer = combineReducers({
  products: productReducer
});


export const store = configureStore({
  reducer: rootReducer
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
