import React, { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { refreshTokens } from './api'; // Импортируем из твоего api.js
import ScrollToTop from './ScrollToTop';

// Стили
import './App.css';
import './Fades.css';

// Общие компоненты интерфейса
import Header from './Header';
import Footer from './Footer';

// Импорты страниц из папки pages/
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import ProductPage from './pages/ProductPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CartPage from './pages/CartPage';
import OrderPostPage from './pages/OrderPostPage';
import ConfirmationPage from './pages/ConfirmationPage';
import ProfilePage from './pages/ProfilePage';

// Импорты админских страниц
import AdminPanel from './pages/admin/AdminPanel';
import OrderDetail from './pages/admin/OrderDetail';
import ChangeProduct from './pages/admin/ChangeProduct';

import ErrorPage from './pages/ErrorPage';
const API_URL = process.env.REACT_APP_API_URL
function App() {
  const [cartItemsCount, setCartItemsCount] = useState(0);

  const handleUpdateCart = async () => {
    setCartItemsCount(prev => prev - 1);
  };

  const handleRemoveCart = async () => {
    setCartItemsCount(0);
  };

  const getCount = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/Cart/get-cartItem-count`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCartItemsCount(Number(data));
      } else if (response.status === 401) {
        const isRefreshed = await refreshTokens();
        if (isRefreshed) {
          return getCount();
        }
      }
    } catch (error) {
      console.error("Ошибка при получении корзины:", error);
    }
  };

  useEffect(() => {
    getCount();
  }, []);

  return (
    <BrowserRouter>
      <Header cartCount={cartItemsCount} />
      <ScrollToTop />
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/catalog' element={<Catalog />} />
        <Route path='/product/:id' element={<ProductPage updateCart={getCount} />} />
        <Route path='/login' element={<LoginPage />} />
        <Route path='/register' element={<RegisterPage />} />
        <Route path='/checkout' element={<OrderPostPage removeItem={handleRemoveCart} />} />
        <Route path='/cart' element={<CartPage removeItem={handleUpdateCart} />} />
        <Route path='/сonfirmation_page/:id' element={<ConfirmationPage />} />
        <Route path='/profile' element={<ProfilePage updateCart={handleRemoveCart} />} />
        
        {/* Админские роуты */}
        <Route path='/admin' element={<AdminPanel />} />
        <Route path="/admin/order/:id" element={<OrderDetail />} />
        <Route path="/admin/change-product/:id" element={<ChangeProduct />} />
        
        {/* Ошибка 404 */}
        <Route path='*' element={<ErrorPage />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}

export default App;