import React, { createContext, useContext, useState } from 'react';

export const CURRENCY_RATES = {
  UAH: 1.0,
  USD: 1 / 41.5,
  EUR: 1 / 45.0
};

export const CURRENCY_SYMBOLS = {
  UAH: '₴',
  USD: '$',
  EUR: '€'
};

const CurrencyContext = createContext();

export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrencyState] = useState(() => {
    return localStorage.getItem("preferred_currency") || "UAH";
  });

  const setCurrency = (c) => {
    if (CURRENCY_RATES[c]) {
      setCurrencyState(c);
      localStorage.setItem("preferred_currency", c);
    }
  };

  const convertPrice = (usdAmount) => {
    const num = Number(usdAmount) || 0;
    const rate = CURRENCY_RATES[currency] || 1;
    return num * rate;
  };

  const formatPrice = (usdAmount) => {
    const converted = convertPrice(usdAmount);
    if (currency === 'UAH') {
      const rounded = Math.round(converted);
      return `${rounded.toLocaleString('uk-UA')} ₴`;
    }
    if (currency === 'EUR') {
      return `€${converted.toFixed(2)}`;
    }
    return `$${converted.toFixed(2)}`;
  };

  return (
    <CurrencyContext.Provider value={{
      currency,
      setCurrency,
      convertPrice,
      formatPrice,
      symbol: CURRENCY_SYMBOLS[currency] || '$',
      rate: CURRENCY_RATES[currency] || 1
    }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
};
