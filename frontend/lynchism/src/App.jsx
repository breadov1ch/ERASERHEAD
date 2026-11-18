import React, { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { refreshTokens, initTokenRefresher } from './api';
import { getGuestCartCount } from './cartManager';
import { LanguageProvider } from './i18n';
import { CurrencyProvider } from './currency';
import ScrollToTop from './ScrollToTop';

// Общие модальные окна
import WelcomeModal from './components/WelcomeModal';
import CookieBanner from './components/CookieBanner';
import ToastNotification from './components/ToastNotification';

// Стили
import './App.css';
import './Fades.css';

// Общие компоненты интерфейса
import Header from './Header';
import Footer from './Footer';

// Страницы
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import ProductPage from './pages/ProductPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import CartPage from './pages/CartPage';
import OrderPostPage from './pages/OrderPostPage';
import ConfirmationPage from './pages/ConfirmationPage';
import ProfilePage from './pages/ProfilePage';
import About from './pages/About';

// Админские страницы
import AdminPanel from './pages/admin/AdminPanel';
import OrderDetail from './pages/admin/OrderDetail';
import ChangeProduct from './pages/admin/ChangeProduct';
import CreateProduct from './pages/admin/CreateProduct';

import ErrorPage from './pages/ErrorPage';

const API_URL = process.env.REACT_APP_API_URL;

function AppContent() {
  const [cartItemsCount, setCartItemsCount] = useState(0);

  const refreshCartCount = async () => {
    const guestCount = getGuestCartCount();
    const token = localStorage.getItem("access_token");

    if (!token) {
      setCartItemsCount(guestCount);
      return;
    }

    try {
      let response = await fetch(`${API_URL}/Cart/get-cartItem-count`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        const isRefreshed = await refreshTokens();
        if (isRefreshed) {
          const freshToken = localStorage.getItem("access_token");
          response = await fetch(`${API_URL}/Cart/get-cartItem-count`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${freshToken}`
            }
          });
        }
      }

      if (response.ok) {
        const data = await response.json();
        setCartItemsCount(Number(data) + guestCount);
      } else {
        setCartItemsCount(guestCount);
      }
    } catch (error) {
      setCartItemsCount(guestCount);
    }
  };

  useEffect(() => {
    refreshCartCount();

    const stopRefresher = initTokenRefresher();

    const handleSync = () => refreshCartCount();
    window.addEventListener("cartUpdated", handleSync);
    return () => {
      window.removeEventListener("cartUpdated", handleSync);
      if (stopRefresher) stopRefresher();
    };
  }, []);

  return (
    <BrowserRouter>
      <WelcomeModal />
      <Header cartCount={cartItemsCount} />
      <ScrollToTop />
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/catalog' element={<Catalog />} />
        <Route path='/product/:id' element={<ProductPage updateCart={refreshCartCount} />} />
        <Route path='/about' element={<About />} />
        <Route path='/login' element={<LoginPage />} />
        <Route path='/register' element={<RegisterPage />} />
        <Route path='/forgot-password' element={<ForgotPasswordPage />} />
        <Route path='/checkout' element={<OrderPostPage removeItem={refreshCartCount} />} />
        <Route path='/cart' element={<CartPage removeItem={refreshCartCount} />} />
        
        {/* Страницы подтверждения заказа */}
        <Route path='/confirmation/:id' element={<ConfirmationPage />} />
        <Route path='/confirmation_page/:id' element={<ConfirmationPage />} />
        <Route path='/сonfirmation_page/:id' element={<ConfirmationPage />} />
        
        <Route path='/profile' element={<ProfilePage updateCart={refreshCartCount} />} />
        
        {/* Админские роуты */}
        <Route path='/admin' element={<AdminPanel />} />
        <Route path="/admin/order/:id" element={<OrderDetail />} />
        <Route path="/admin/change-product/:id" element={<ChangeProduct />} />
        <Route path="/admin/create-product" element={<CreateProduct />} />
        
        {/* Ошибка 404 */}
        <Route path='*' element={<ErrorPage />} />
      </Routes>
      <Footer />
      <CookieBanner />
      <ToastNotification />
    </BrowserRouter>
  );
}

function App() {
  return (
    <LanguageProvider>
      <CurrencyProvider>
        <AppContent />
      </CurrencyProvider>
    </LanguageProvider>
  );
}

export default App;
