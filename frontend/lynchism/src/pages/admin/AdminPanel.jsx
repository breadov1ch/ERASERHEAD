import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { refreshTokens } from '../../api';
import { API_URL } from '../../config';
import { sortSizesDesc } from '../../sizeUtils';

export default function AdminPanel() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");

  // Активная вкладка: 'products' | 'orders' | 'users' | 'tools'
  const [activeTab, setActiveTab] = useState('products');

  // Пользователь
  const [me, setMe] = useState(null);

  // Товары
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productCategory, setProductCategory] = useState('ALL');

  // Заказы
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [orderSearch, setOrderSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Пользователи
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  // Промокоды
  const [promos, setPromos] = useState([]);
  const [loadingPromos, setLoadingPromos] = useState(false);
  const [promoForm, setPromoForm] = useState({
    code: '',
    discountType: 'percent', // 'percent' | 'amount'
    discountValue: 10,
    minOrderSum: 0,
    daysValid: 30,
    maxUsages: ''
  });
  const [creatingPromo, setCreatingPromo] = useState(false);
  const [promoMsg, setPromoMsg] = useState('');
  const [promoError, setPromoError] = useState('');

  // Форма добавления сотрудника
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffForm, setStaffForm] = useState({ name: '', email: '', password: '', role: 'Staff' });
  const [staffMsg, setStaffMsg] = useState('');

  // Уведомления
  const [notification, setNotification] = useState('');

  const showNotify = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 4000);
  };

  // Проверка авторизации
  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchMe();
  }, [token, navigate]);

  const fetchMe = async () => {
    try {
      const res = await fetch(`${API_URL}/Client/me`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMe(data);
        if (data.role !== 'Admin' && data.role !== 'Staff' && data.role !== 'Manager') {
          alert('Доступ запрещен. У вашей учетной записи нет прав администратора.');
          navigate('/');
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Загрузка данных при переключении табов
  useEffect(() => {
    if (!token) return;
    if (activeTab === 'products') fetchProducts();
    if (activeTab === 'orders') fetchOrders();
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'promos') fetchPromos();
  }, [activeTab, page, pageSize, orderStatusFilter, token]);

  // 1. Получение товаров
  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch(`${API_URL}/Product/GetProducts`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Удаление товара
  const handleDeleteProduct = async (id, name) => {
    if (!window.confirm(`Вы уверены, что хотите безвозвратно удалить товар "${name}" (ID #${id})?`)) return;
    try {
      const res = await fetch(`${API_URL}/Product/delete/${id}`, {
        method: 'DELETE',
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setProducts(prev => prev.filter(p => p.id !== id));
        showNotify(`Товар "${name}" успешно удален`);
      } else {
        alert('Не удалось удалить товар');
      }
    } catch (err) {
      console.error(err);
      alert('Ошибка при удалении товара');
    }
  };

  // 2. Получение заказов
  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const statusParam = orderStatusFilter && orderStatusFilter !== 'ALL' ? `&status=${encodeURIComponent(orderStatusFilter)}` : '';
      const res = await fetch(`${API_URL}/Order/getAllOrders?page=${page}&pageSize=${pageSize}${statusParam}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.items || []);
        setTotalPages(data.totalPages || 1);
      } else if (res.status === 404) {
        setOrders([]);
        setTotalPages(1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOrders(false);
    }
  };

  // 2.1 Получение промокодов
  const fetchPromos = async () => {
    setLoadingPromos(true);
    try {
      const res = await fetch(`${API_URL}/PromoCode/all`);
      if (res.ok) {
        const data = await res.json();
        setPromos(data || []);
      }
    } catch (err) {
      console.error("Fetch promos error:", err);
    } finally {
      setLoadingPromos(false);
    }
  };

  // Создание промокода
  const handleCreatePromo = async (e) => {
    e.preventDefault();
    if (!promoForm.code.trim()) {
      setPromoError("Введіть назву промокоду");
      return;
    }
    setCreatingPromo(true);
    setPromoError("");
    setPromoMsg("");

    const isPercent = promoForm.discountType === 'percent';
    const numVal = Number(promoForm.discountValue) || 0;

    const payload = {
      code: promoForm.code.trim().toUpperCase(),
      discountPercent: isPercent ? numVal : 0,
      discountAmount: !isPercent ? numVal : 0,
      minOrderSum: Number(promoForm.minOrderSum) || 0,
      daysValid: promoForm.daysValid ? Number(promoForm.daysValid) : null,
      maxUsages: promoForm.maxUsages ? Number(promoForm.maxUsages) : null
    };

    try {
      const res = await fetch(`${API_URL}/PromoCode/create`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        setPromoMsg(`Промокод "${data.code}" успішно створено!`);
        setPromoForm({
          code: '',
          discountType: 'percent',
          discountValue: 10,
          minOrderSum: 0,
          daysValid: 30,
          maxUsages: ''
        });
        fetchPromos();
      } else {
        setPromoError(data.message || "Помилка при створенні промокоду");
      }
    } catch (err) {
      console.error("Create promo error:", err);
      setPromoError("Мережева помилка при створенні промокоду");
    } finally {
      setCreatingPromo(false);
    }
  };

  // Включение/отключение промокода
  const handleTogglePromo = async (id) => {
    try {
      const res = await fetch(`${API_URL}/PromoCode/toggle/${id}`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        fetchPromos();
        showNotify("Статус промокоду оновлено");
      }
    } catch (err) {
      console.error("Toggle promo error:", err);
    }
  };

  // Удаление промокода
  const handleDeletePromo = async (id, code) => {
    if (!window.confirm(`Видалити промокод "${code}"?`)) return;
    try {
      const res = await fetch(`${API_URL}/PromoCode/delete/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setPromos(prev => prev.filter(p => p.id !== id));
        showNotify(`Промокод "${code}" видалено`);
      }
    } catch (err) {
      console.error("Delete promo error:", err);
    }
  };

  // Смена статуса заказа
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch(`${API_URL}/Admin/update-status?id=${orderId}&status=${newStatus}`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        showNotify(`Статус заказа #${orderId} изменен на: ${newStatus}`);
      } else {
        alert('Не удалось обновить статус');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Удаление заказа
  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm(`Удалить заказ #${orderId} из системы?`)) return;
    try {
      const res = await fetch(`${API_URL}/Order/delete_order?orderId=${orderId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setOrders(prev => prev.filter(o => o.id !== orderId));
        showNotify(`Заказ #${orderId} удален`);
      } else {
        alert('Не удалось удалить заказ');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 3. Получение пользователей
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch(`${API_URL}/Client/clients`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Смена роли пользователя
  const handleUpdateRole = async (clientId, newRole) => {
    if (!window.confirm(`Изменить роль пользователя ID #${clientId} на "${newRole}"?`)) return;
    try {
      const res = await fetch(`${API_URL}/Client/update-role`, {
        method: "PUT",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ clientId, role: newRole })
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === clientId ? { ...u, role: newRole } : u));
        showNotify(`Роль пользователя обновлена на ${newRole}`);
      } else {
        alert('Не удалось обновить роль');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Создание сотрудника
  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setStaffMsg('');
    try {
      const res = await fetch(`${API_URL}/Client/create-staff`, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(staffForm)
      });
      if (res.ok) {
        showNotify(`Сотрудник ${staffForm.email} успешно добавлен!`);
        setShowStaffModal(false);
        setStaffForm({ name: '', email: '', password: '', role: 'Staff' });
        fetchUsers();
      } else {
        const errText = await res.text();
        setStaffMsg(errText || 'Ошибка при создании сотрудника');
      }
    } catch (err) {
      setStaffMsg('Сетевая ошибка');
    }
  };

  // Очистка каталога (опасное действие)
  const handlePurgeAllProducts = async () => {
    const confirmation = window.prompt("ВНИМАНИЕ! Это действие удалит ВСЕ товары из каталога.\nДля подтверждения введите слово 'DELETE':");
    if (confirmation !== 'DELETE') {
      alert('Действие отменено.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/Product/clear-everything`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setProducts([]);
        showNotify('Каталог товаров полностью очищен');
      } else {
        alert('Ошибка при очистке');
      }
    } catch (e) {
      alert('Ошибка сети при очистке');
    }
  };

  // Фильтрация товаров
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
                          (p.category && p.category.toLowerCase().includes(productSearch.toLowerCase())) ||
                          p.id.toString() === productSearch;
    const matchesCategory = productCategory === 'ALL' || (p.category && p.category.toLowerCase() === productCategory.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  // Фильтрация заказов
  const filteredOrders = orders.filter(o => {
    const matchesStatus = orderStatusFilter === 'ALL' || o.status.toLowerCase() === orderStatusFilter.toLowerCase();
    const matchesSearch = orderSearch === '' || 
                          o.id.toString().includes(orderSearch) ||
                          (o.items && o.items.some(i => i.productName && i.productName.toLowerCase().includes(orderSearch.toLowerCase())));
    return matchesStatus && matchesSearch;
  });

  // Фильтрация пользователей
  const filteredUsers = users.filter(u => {
    return u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
           u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
           u.role.toLowerCase().includes(userSearch.toLowerCase());
  });

  const categoriesList = ['ALL', 'Pants', 'Outerwear', 'Tops', 'Accessories'];

  return (
    <div className="min-h-screen bg-[#131313] text-zinc-300 font-sans pb-20">
      
      {/* Верхняя информационная полоса */}
      <div className="bg-[#181818] border-b border-zinc-700 px-6 py-4 shadow-md">
        <div className="max-w-[1700px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 bg-white text-black font-black flex items-center justify-center text-sm">
              AD
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-white text-lg font-black uppercase tracking-wider">Панель Управления</h1>
                <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5">
                  ONLINE
                </span>
              </div>
              <p className="text-zinc-500 text-xs font-mono">
                Администратор: <span className="text-white font-bold">{me?.email || 'olga0669368037@gmail.com'}</span> (Роль: {me?.role || 'Admin'})
              </p>
            </div>
          </div>

          {/* Быстрые ссылки в шапке */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/create-product')}
              className="bg-white text-black px-4 py-2 font-black text-xs uppercase tracking-wider hover:bg-zinc-200 transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <span>+</span> Создать товар
            </button>
            <button
              onClick={() => navigate('/catalog')}
              className="border border-zinc-700 bg-zinc-900/60 text-zinc-300 hover:text-white px-3.5 py-2 text-xs uppercase tracking-wider hover:border-zinc-500 transition-colors cursor-pointer"
            >
              В магазин
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                window.dispatchEvent(new Event('authChanged'));
                navigate('/login');
              }}
              className="border border-red-950/60 bg-red-950/20 text-red-400 hover:bg-red-900/40 px-3.5 py-2 text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Выйти
            </button>
          </div>
        </div>
      </div>

      {/* Уведомление об успехе */}
      {notification && (
        <div className="max-w-[1700px] mx-auto px-6 mt-4">
          <div className="bg-emerald-950/50 border border-emerald-500/50 text-emerald-200 px-4 py-2.5 text-xs font-mono flex items-center justify-between animate-fade-in">
            <span>✓ {notification}</span>
            <button onClick={() => setNotification('')} className="text-zinc-400 hover:text-white text-sm">✕</button>
          </div>
        </div>
      )}

      {/* Основной контейнер */}
      <div className="max-w-[1700px] mx-auto px-6 mt-6">

        {/* Сводные карточки со статистикой */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#0d0d0d] border border-zinc-900 p-4">
            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">Товаров в каталоге</span>
            <span className="text-2xl font-black text-white font-mono mt-1 block">{products.length}</span>
            <button 
              onClick={() => { setActiveTab('products'); fetchProducts(); }} 
              className="text-[10px] text-zinc-400 hover:text-white underline mt-2 inline-block font-mono"
            >
              Управление товарами →
            </button>
          </div>

          <div className="bg-[#0d0d0d] border border-zinc-900 p-4">
            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">Заказов в базе</span>
            <span className="text-2xl font-black text-white font-mono mt-1 block">{orders.length}</span>
            <button 
              onClick={() => { setActiveTab('orders'); fetchOrders(); }} 
              className="text-[10px] text-zinc-400 hover:text-white underline mt-2 inline-block font-mono"
            >
              Список заказов →
            </button>
          </div>

          <div className="bg-[#0d0d0d] border border-zinc-900 p-4">
            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">Пользователей</span>
            <span className="text-2xl font-black text-white font-mono mt-1 block">{users.length || '—'}</span>
            <button 
              onClick={() => { setActiveTab('users'); fetchUsers(); }} 
              className="text-[10px] text-zinc-400 hover:text-white underline mt-2 inline-block font-mono"
            >
              Роли и персонал →
            </button>
          </div>

          <div className="bg-[#0d0d0d] border border-zinc-900 p-4">
            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">Инструменты & База</span>
            <span className="text-xs font-mono text-emerald-400 mt-2 block">PostgreSQL Neon DB</span>
            <button 
              onClick={() => setActiveTab('tools')} 
              className="text-[10px] text-zinc-400 hover:text-white underline mt-2 inline-block font-mono"
            >
              Быстрые настройки →
            </button>
          </div>
        </div>

        {/* Навигационные вкладки */}
        <div className="flex border-b border-zinc-800 gap-2 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-5 py-3 text-xs uppercase font-bold tracking-wider transition-colors cursor-pointer flex items-center gap-2 border-b-2 -mb-px ${
              activeTab === 'products'
                ? 'border-white text-white bg-zinc-900/40'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>📦</span>
            <span>Товары ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`px-5 py-3 text-xs uppercase font-bold tracking-wider transition-colors cursor-pointer flex items-center gap-2 border-b-2 -mb-px ${
              activeTab === 'orders'
                ? 'border-white text-white bg-zinc-900/40'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>🛒</span>
            <span>Заказы</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-5 py-3 text-xs uppercase font-bold tracking-wider transition-colors cursor-pointer flex items-center gap-2 border-b-2 -mb-px ${
              activeTab === 'users'
                ? 'border-white text-white bg-zinc-900/40'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>👥</span>
            <span>Пользователи и Роли</span>
          </button>

          <button
            onClick={() => setActiveTab('promos')}
            className={`px-5 py-3 text-xs uppercase font-bold tracking-wider transition-colors cursor-pointer flex items-center gap-2 border-b-2 -mb-px ${
              activeTab === 'promos'
                ? 'border-white text-white bg-zinc-900/40'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>🎟️</span>
            <span>Промокоди ({promos.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('tools')}
            className={`px-5 py-3 text-xs uppercase font-bold tracking-wider transition-colors cursor-pointer flex items-center gap-2 border-b-2 -mb-px ${
              activeTab === 'tools'
                ? 'border-white text-white bg-zinc-900/40'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>⚡</span>
            <span>Инструменты и Помощь</span>
          </button>
        </div>

        {/* ВКЛАДКА 1: ТОВАРЫ */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            
            {/* Панель фильтров и поиска товаров */}
            <div className="bg-[#0e0e0e] border border-zinc-900 p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 flex-grow max-w-2xl">
                <div className="relative flex-grow min-w-[200px]">
                  <input
                    type="text"
                    placeholder="Поиск по названию или ID..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full bg-black border border-zinc-800 px-3 py-2 text-xs text-white placeholder-zinc-600 outline-none focus:border-zinc-500 font-mono"
                  />
                  {productSearch && (
                    <button 
                      onClick={() => setProductSearch('')} 
                      className="absolute right-2.5 top-2 text-zinc-500 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 border border-zinc-800 bg-black p-0.5 text-xs">
                  {categoriesList.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setProductCategory(cat)}
                      className={`px-3 py-1.5 uppercase font-mono tracking-wider transition-colors cursor-pointer ${
                        productCategory === cat ? 'bg-white text-black font-bold' : 'text-zinc-500 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={fetchProducts}
                  className="border border-zinc-800 bg-black hover:bg-zinc-900 text-zinc-300 px-3 py-2 text-xs uppercase font-mono tracking-wider cursor-pointer"
                  title="Обновить список товаров"
                >
                  ↻ Обновить
                </button>
                <button
                  onClick={() => navigate('/admin/create-product')}
                  className="bg-white text-black px-4 py-2 font-black text-xs uppercase tracking-wider hover:bg-zinc-200 cursor-pointer font-mono"
                >
                  + Добавить товар
                </button>
              </div>
            </div>

            {/* Таблица товаров */}
            <div className="border border-zinc-900 bg-[#0d0d0d] overflow-x-auto">
              {loadingProducts ? (
                <div className="p-12 text-center text-zinc-500 font-mono text-xs">
                  Загрузка каталога товаров...
                </div>
              ) : filteredProducts.length > 0 ? (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-black border-b border-zinc-900 text-zinc-500 font-mono text-[11px] uppercase tracking-wider">
                      <th className="p-3.5">Превью</th>
                      <th className="p-3.5">ID</th>
                      <th className="p-3.5">Название</th>
                      <th className="p-3.5">Категория</th>
                      <th className="p-3.5">Цена (грн)</th>
                      <th className="p-3.5">Остатки (Размеры)</th>
                      <th className="p-3.5 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {filteredProducts.map(p => {
                      const displayImg = (!p.imageURL || p.imageURL.includes('ibb.co')) 
                        ? 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=400&q=80' 
                        : p.imageURL;

                      return (
                        <tr key={p.id} className="hover:bg-zinc-950/60 transition-colors">
                          <td className="p-3.5 w-16">
                            <img 
                              src={displayImg} 
                              alt={p.name}
                              className="w-12 h-14 object-cover border border-zinc-800 bg-black"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=400&q=80';
                              }}
                            />
                          </td>
                          <td className="p-3.5 font-mono text-zinc-500">#{p.id}</td>
                          <td className="p-3.5">
                            <span 
                              onClick={() => navigate(`/product/${p.id}`)}
                              className="font-bold text-white uppercase hover:underline cursor-pointer block"
                            >
                              {p.name}
                            </span>
                            {p.isPreOrder && (
                              <span className="inline-block mt-1 px-1.5 py-0.5 text-[9px] font-bold font-mono uppercase bg-amber-500/10 text-amber-300 border border-amber-500/40">
                                ★ ПРЕДЗАКАЗ // PRE-ORDER
                              </span>
                            )}
                            <span className="text-[10px] text-zinc-500 block truncate max-w-xs font-mono mt-0.5">
                              {p.description || "Без описания"}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono">
                            <span className="bg-zinc-900 border border-zinc-800 px-2 py-0.5 text-zinc-400 text-[10px] uppercase">
                              {p.category || 'Standard'}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono text-white font-bold text-sm">
                            {Number(p.price).toLocaleString('uk-UA')} ₴
                          </td>
                          <td className="p-3.5 font-mono text-[11px]">
                            {p.isPreOrder ? (
                              <span className="text-amber-300 font-bold text-[10px] uppercase font-mono block">
                                ∞ НЕОГРАНИЧЕНО (ПРЕДЗАКАЗ)
                              </span>
                            ) : p.sizes && p.sizes.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5 max-w-xs">
                                {sortSizesDesc(p.sizes).map((s, idx) => (
                                  <span 
                                    key={idx} 
                                    className={`px-1.5 py-0.5 border text-[10px] ${
                                      s.quantity > 0 
                                        ? 'border-zinc-800 bg-black text-zinc-300' 
                                        : 'border-red-900/60 bg-red-950/30 text-red-400'
                                    }`}
                                  >
                                    {s.size}: <span className="font-bold">{s.quantity}</span>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-zinc-600 text-[10px]">Нет размеров</span>
                            )}
                          </td>
                          <td className="p-3.5 text-right font-mono">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => navigate(`/admin/change-product/${p.id}`)}
                                className="border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-white px-2.5 py-1 text-[11px] uppercase cursor-pointer"
                                title="Редактировать товар"
                              >
                                Ред.
                              </button>
                              <button
                                onClick={() => navigate(`/product/${p.id}`)}
                                className="border border-zinc-800 bg-black hover:bg-zinc-900 text-zinc-400 hover:text-white px-2 py-1 text-[11px] cursor-pointer"
                                title="Посмотреть на витрине"
                              >
                                👁️
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p.id, p.name)}
                                className="border border-red-900/50 bg-red-950/20 hover:bg-red-900/40 text-red-400 px-2 py-1 text-[11px] cursor-pointer"
                                title="Удалить товар"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="p-16 text-center space-y-4">
                  <div className="text-3xl">📦</div>
                  <h3 className="text-white text-base font-bold uppercase font-mono">Товары не найдены</h3>
                  <p className="text-zinc-500 text-xs font-mono max-w-md mx-auto">
                    {productSearch || productCategory !== 'ALL'
                      ? 'По вашему фильтру ничего не найдено. Попробуйте сбросить поиск.'
                      : 'В каталоге сейчас нет товаров. Создайте ваш первый товар с удобной таблицей размеров и фотографиями.'}
                  </p>
                  <button
                    onClick={() => navigate('/admin/create-product')}
                    className="bg-white text-black px-6 py-3 font-black text-xs uppercase tracking-wider hover:bg-zinc-200 cursor-pointer font-mono inline-block"
                  >
                    + Добавить первый товар
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ВКЛАДКА 2: ЗАКАЗЫ */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {/* Фильтры заказов */}
            <div className="bg-[#0e0e0e] border border-zinc-900 p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  placeholder="Поиск по ID заказа или товару..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="bg-black border border-zinc-800 px-3 py-2 text-xs text-white placeholder-zinc-600 outline-none focus:border-zinc-500 font-mono w-64"
                />

                <div className="flex items-center gap-1 border border-zinc-800 bg-black p-0.5 text-xs">
                  {['ALL', 'Paid', 'Prepaid_Deposit', 'Pending', 'Shipped', 'Completed', 'Cancelled'].map(st => (
                    <button
                      key={st}
                      onClick={() => setOrderStatusFilter(st)}
                      className={`px-3 py-1.5 uppercase font-mono tracking-wider transition-colors cursor-pointer ${
                        orderStatusFilter === st ? 'bg-white text-black font-bold' : 'text-zinc-500 hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={fetchOrders}
                  className="border border-zinc-800 bg-black hover:bg-zinc-900 text-zinc-300 px-3 py-2 text-xs uppercase font-mono tracking-wider cursor-pointer"
                >
                  ↻ Обновить
                </button>
              </div>
            </div>

            {/* Таблица заказов */}
            <div className="border border-zinc-900 bg-[#0d0d0d] overflow-x-auto">
              {loadingOrders ? (
                <div className="p-12 text-center text-zinc-500 font-mono text-xs">
                  Загрузка заказов...
                </div>
              ) : filteredOrders.length > 0 ? (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-black border-b border-zinc-900 text-zinc-500 font-mono text-[11px] uppercase tracking-wider">
                      <th className="p-3.5">ID</th>
                      <th className="p-3.5">Дата</th>
                      <th className="p-3.5">Состав заказа</th>
                      <th className="p-3.5">Сумма (грн)</th>
                      <th className="p-3.5">Статус (Быстрая смена)</th>
                      <th className="p-3.5 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {filteredOrders.map(o => (
                      <tr key={o.id} className="hover:bg-zinc-950/60 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-white">#{o.id}</td>
                        <td className="p-3.5 font-mono text-zinc-400">
                          {o.date ? new Date(o.date).toLocaleString() : '—'}
                        </td>
                        <td className="p-3.5">
                          <div className="space-y-1">
                            {o.items && o.items.map((it, idx) => (
                              <div key={idx} className="font-mono text-[11px] text-zinc-300">
                                • <span className="text-white font-medium">{it.productName}</span> 
                                <span className="text-zinc-500 ml-1">({it.size})</span> 
                                <span className="text-zinc-400 font-bold ml-1">×{it.quantity}</span>
                              </div>
                            ))}
                          </div>
                          {/* Инфо о доставке и перевозчике */}
                          <div className="mt-2 pt-2 border-t border-zinc-900 text-[10px] font-mono text-zinc-400 space-y-0.5">
                            <div>
                              <span className="text-zinc-500">Доставка:</span>{' '}
                              <span className="text-amber-400 font-bold">{o.carrier || 'Нова Пошта'}</span>{' '}
                              <span className="text-zinc-400">({o.deliveryType || 'Відділення'})</span>
                              {o.deliveryCost > 0 && <span className="text-zinc-500 ml-1">+{o.deliveryCost} ₴</span>}
                            </div>
                            {(o.deliveryCity || o.deliveryBranch || o.streetAddress) && (
                              <div className="text-zinc-300 truncate max-w-sm">
                                📍 {o.deliveryCity ? `${o.deliveryCity}, ` : ''}{o.deliveryBranch || o.streetAddress}
                              </div>
                            )}
                            {o.promoCode && (
                              <div className="text-emerald-400 font-bold">
                                🎟️ Промокод: {o.promoCode} (-{o.discountSum || 0} ₴)
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5 font-mono text-sm font-bold text-white">
                          {Number(o.totalSum).toLocaleString('uk-UA')} ₴
                        </td>
                        <td className="p-3.5">
                          <select
                            value={o.status}
                            onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)}
                            className={`font-mono text-xs px-2.5 py-1 uppercase font-bold border outline-none cursor-pointer bg-black ${
                              o.status === 'Completed'
                                ? 'border-emerald-500 text-emerald-400'
                                : o.status === 'Paid'
                                ? 'border-teal-500 text-teal-400'
                                : o.status === 'Prepaid_Deposit'
                                ? 'border-indigo-400 text-indigo-300'
                                : o.status === 'Shipped'
                                ? 'border-blue-500 text-blue-400'
                                : o.status === 'Cancelled'
                                ? 'border-red-500 text-red-400'
                                : 'border-amber-500 text-amber-400'
                            }`}
                          >
                            <option value="Pending">Pending (Ожидает)</option>
                            <option value="Prepaid_Deposit">Prepaid (Предоплата 100 ₴)</option>
                            <option value="Paid">Paid (Оплачен полностью)</option>
                            <option value="Processing">Processing (Сборка)</option>
                            <option value="Shipped">Shipped (Отправлен)</option>
                            <option value="Completed">Completed (Выполнен)</option>
                            <option value="Cancelled">Cancelled (Отменен)</option>
                          </select>
                        </td>
                        <td className="p-3.5 text-right font-mono">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => navigate(`/admin/order/${o.id}`)}
                              className="border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-white px-3 py-1 text-xs uppercase cursor-pointer"
                            >
                              Детали
                            </button>
                            <button
                              onClick={() => handleDeleteOrder(o.id)}
                              className="border border-red-900/50 bg-red-950/20 hover:bg-red-900/40 text-red-400 px-2 py-1 text-xs cursor-pointer"
                              title="Удалить заказ"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-16 text-center space-y-3 font-mono">
                  <div className="text-3xl">🛒</div>
                  <h3 className="text-white text-base font-bold uppercase">Заказов пока нет</h3>
                  <p className="text-zinc-500 text-xs">
                    Когда покупатели оформят первый заказ на сайте, он отобразится здесь с возможностью менять статус и просматривать данные доставки.
                  </p>
                </div>
              )}

              {/* Пагинация заказов */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-zinc-900 px-4 py-3 bg-black font-mono text-xs">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="border border-zinc-800 px-3 py-1 hover:bg-zinc-900 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    ← Назад
                  </button>
                  <span className="text-zinc-400">
                    Страница <span className="text-white font-bold">{page}</span> из {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="border border-zinc-800 px-3 py-1 hover:bg-zinc-900 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Вперед →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ВКЛАДКА 3: ПОЛЬЗОВАТЕЛИ И РОЛИ */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="bg-[#0e0e0e] border border-zinc-900 p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Поиск по email, имени или роли..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="bg-black border border-zinc-800 px-3 py-2 text-xs text-white placeholder-zinc-600 outline-none focus:border-zinc-500 font-mono w-72"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={fetchUsers}
                  className="border border-zinc-800 bg-black hover:bg-zinc-900 text-zinc-300 px-3 py-2 text-xs uppercase font-mono tracking-wider cursor-pointer"
                >
                  ↻ Обновить
                </button>
                <button
                  onClick={() => setShowStaffModal(true)}
                  className="bg-white text-black px-4 py-2 font-black text-xs uppercase tracking-wider hover:bg-zinc-200 cursor-pointer font-mono"
                >
                  + Добавить сотрудника
                </button>
              </div>
            </div>

            {/* Таблица пользователей */}
            <div className="border border-zinc-900 bg-[#0d0d0d] overflow-x-auto">
              {loadingUsers ? (
                <div className="p-12 text-center text-zinc-500 font-mono text-xs">
                  Загрузка списка пользователей...
                </div>
              ) : filteredUsers.length > 0 ? (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-black border-b border-zinc-900 text-zinc-500 font-mono text-[11px] uppercase tracking-wider">
                      <th className="p-3.5">ID</th>
                      <th className="p-3.5">Пользователь</th>
                      <th className="p-3.5">Email</th>
                      <th className="p-3.5">Текущая роль</th>
                      <th className="p-3.5">Назначить роль</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-zinc-950/60 transition-colors">
                        <td className="p-3.5 font-mono text-zinc-500">#{u.id}</td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-white text-xs">
                              {(u.name || "U")[0].toUpperCase()}
                            </div>
                            <span className="font-bold text-white uppercase">{u.name}</span>
                          </div>
                        </td>
                        <td className="p-3.5 font-mono text-zinc-300">{u.email}</td>
                        <td className="p-3.5 font-mono">
                          <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase border ${
                            u.role === 'Admin' 
                              ? 'border-purple-500/50 bg-purple-950/30 text-purple-300'
                              : u.role === 'Staff' || u.role === 'Manager'
                              ? 'border-blue-500/50 bg-blue-950/30 text-blue-300'
                              : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono">
                          <select
                            value={u.role}
                            onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                            className="bg-black border border-zinc-700 text-white px-2 py-1 text-xs outline-none cursor-pointer hover:border-white"
                          >
                            <option value="Client">Client (Покупатель)</option>
                            <option value="Staff">Staff (Менеджер склада)</option>
                            <option value="Admin">Admin (Администратор)</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center text-zinc-500 font-mono text-xs">
                  Пользователи не найдены.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ВКЛАДКА 4: ИНСТРУМЕНТЫ И ПОМОЩЬ */}
        {activeTab === 'tools' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-mono text-xs">
            
            {/* Карточка: Памятка администратора */}
            <div className="bg-[#0d0d0d] border border-zinc-900 p-6 space-y-4">
              <h2 className="text-white text-sm font-bold uppercase tracking-wider border-b border-zinc-800 pb-2">
                📖 Инструкция администратора
              </h2>
              <ul className="space-y-3 text-zinc-400 leading-relaxed">
                <li>
                  <strong className="text-white">1. Создание товара:</strong> Перейдите по кнопке "+ Создать товар", заполните название, цену, категорию и выберите готовый шаблон таблицы размеров (Штаны, Верх, Куртки или Свой).
                </li>
                <li>
                  <strong className="text-white">2. Фотографии:</strong> Можно загружать как прямую ссылку на фото, так и несколько дополнительных ракурсов. Они автоматически отображаются в галерее карточки товара.
                </li>
                <li>
                  <strong className="text-white">3. Таблица размеров:</strong> В форме создания товара вы можете добавить любые параметры под каждый размер (длина, талия, обхват груди и т.д.). На странице товара отобразится ровно то, что вы указали.
                </li>
                <li>
                  <strong className="text-white">4. Управление заказами:</strong> Прямо в таблице заказов можно менять статус с `Pending` на `Shipped` или `Completed` — данные сразу сохраняются в базе данных.
                </li>
                <li>
                  <strong className="text-white">5. Валюта цен (UAH ₴):</strong> Все цены на товары и в заказах указываются в <strong>гривнах (₴)</strong>. Для иностранных клиентов магазин автоматически конвертирует стоимость в USD ($) и EUR (€) по актуальному курсу.
                </li>
              </ul>
            </div>

            {/* Карточка: Опасные операции / База данных */}
            <div className="bg-[#0d0d0d] border border-red-950/60 p-6 space-y-4">
              <h2 className="text-red-400 text-sm font-bold uppercase tracking-wider border-b border-red-950/60 pb-2">
                ⚠️ Опасная зона: Управление базой
              </h2>
              <p className="text-zinc-400 leading-relaxed">
                Здесь можно выполнить полную очистку каталога товаров. Используйте эту функцию, если хотите заново заполнить каталог с нуля.
              </p>
              
              <div className="pt-2">
                <button
                  onClick={handlePurgeAllProducts}
                  className="bg-red-950/40 border border-red-600/80 hover:bg-red-900/60 text-red-300 px-4 py-2.5 uppercase font-bold text-xs tracking-wider cursor-pointer transition-colors"
                >
                  🗑️ Очистить все товары из каталога
                </button>
              </div>

              <div className="border-t border-zinc-900 pt-4 text-zinc-500 text-[11px]">
                База данных: Neon PostgreSQL (AWS Cloud)<br/>
                API-сервер: http://localhost:5031
              </div>
            </div>

          </div>
        )}

        {/* ВКЛАДКА: ПРОМОКОДИ */}
        {activeTab === 'promos' && (
          <div className="space-y-6 font-mono">
            {/* Форма создания промокода */}
            <div className="bg-[#0e0e0e] border border-zinc-800 p-6 space-y-4 shadow-xl">
              <div className="border-b border-zinc-800 pb-3 flex justify-between items-center">
                <h2 className="text-white text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                  <span>🎟️</span> Створити новий промокод
                </h2>
                <span className="text-[10px] text-zinc-500 uppercase">PROMO_DISCOUNT_ENGINE</span>
              </div>

              {promoMsg && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-500 text-emerald-300 text-xs">
                  ✓ {promoMsg}
                </div>
              )}
              {promoError && (
                <div className="p-3 bg-red-950/60 border border-red-500 text-red-300 text-xs">
                  ✕ {promoError}
                </div>
              )}

              <form onSubmit={handleCreatePromo} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="text-zinc-400 block mb-1 uppercase font-bold text-[10px] tracking-wider">
                    Код купона / Назва *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Наприклад: VOID10, SALE500"
                    value={promoForm.code}
                    onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })}
                    className="w-full bg-black border border-zinc-800 px-3 py-2 text-white outline-none focus:border-zinc-500 uppercase tracking-widest font-bold"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1 uppercase font-bold text-[10px] tracking-wider">
                    Тип знижки *
                  </label>
                  <select
                    value={promoForm.discountType}
                    onChange={(e) => setPromoForm({ ...promoForm, discountType: e.target.value })}
                    className="w-full bg-black border border-zinc-800 px-3 py-2 text-white outline-none focus:border-zinc-500 cursor-pointer"
                  >
                    <option value="percent">Відсоток знижки (%)</option>
                    <option value="amount">Фіксована сума (грн ₴)</option>
                  </select>
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1 uppercase font-bold text-[10px] tracking-wider">
                    {promoForm.discountType === 'percent' ? 'Розмір знижки (%) *' : 'Розмір знижки (грн ₴) *'}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={promoForm.discountType === 'percent' ? '100' : '99999'}
                    value={promoForm.discountValue}
                    onChange={(e) => setPromoForm({ ...promoForm, discountValue: e.target.value })}
                    className="w-full bg-black border border-zinc-800 px-3 py-2 text-white outline-none focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1 uppercase font-bold text-[10px] tracking-wider">
                    Мін. сума замовлення (грн ₴)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 = без обмежень"
                    value={promoForm.minOrderSum}
                    onChange={(e) => setPromoForm({ ...promoForm, minOrderSum: e.target.value })}
                    className="w-full bg-black border border-zinc-800 px-3 py-2 text-white outline-none focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1 uppercase font-bold text-[10px] tracking-wider">
                    Термін дії (днів)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="30 днів (за замовчуванням)"
                    value={promoForm.daysValid}
                    onChange={(e) => setPromoForm({ ...promoForm, daysValid: e.target.value })}
                    className="w-full bg-black border border-zinc-800 px-3 py-2 text-white outline-none focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1 uppercase font-bold text-[10px] tracking-wider">
                    Макс. кількість активацій
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Порожньо = безлімітно"
                    value={promoForm.maxUsages}
                    onChange={(e) => setPromoForm({ ...promoForm, maxUsages: e.target.value })}
                    className="w-full bg-black border border-zinc-800 px-3 py-2 text-white outline-none focus:border-zinc-500"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-3 pt-2">
                  <button
                    type="submit"
                    disabled={creatingPromo}
                    className="bg-white text-black font-black uppercase text-xs tracking-widest px-6 py-3 hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {creatingPromo ? 'СТВОРЕННЯ...' : '+ Створити промокод'}
                  </button>
                </div>
              </form>
            </div>

            {/* Список промокодов */}
            <div className="border border-zinc-900 bg-[#0d0d0d] overflow-x-auto shadow-xl">
              <div className="p-4 border-b border-zinc-900 flex justify-between items-center">
                <h3 className="text-white text-xs font-bold uppercase tracking-wider">
                  Активні промокоди в системі ({promos.length})
                </h3>
                <button
                  onClick={fetchPromos}
                  className="border border-zinc-800 bg-black hover:bg-zinc-900 text-zinc-300 px-3 py-1.5 text-xs uppercase cursor-pointer"
                >
                  ↻ Оновити
                </button>
              </div>

              {loadingPromos ? (
                <div className="p-12 text-center text-zinc-500 text-xs">Завантаження промокодів...</div>
              ) : promos.length > 0 ? (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-black border-b border-zinc-900 text-zinc-500 text-[11px] uppercase tracking-wider">
                      <th className="p-3.5">Код</th>
                      <th className="p-3.5">Знижка</th>
                      <th className="p-3.5">Мін. сума</th>
                      <th className="p-3.5">Використання</th>
                      <th className="p-3.5">Діє до</th>
                      <th className="p-3.5">Статус</th>
                      <th className="p-3.5 text-right">Дії</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {promos.map(pr => {
                      const isExpired = pr.expiryDate && new Date(pr.expiryDate) < new Date();
                      return (
                        <tr key={pr.id} className="hover:bg-zinc-950/60 transition-colors">
                          <td className="p-3.5 font-bold text-white tracking-wider">
                            <span className="px-2.5 py-1 bg-zinc-900 border border-zinc-700 text-white font-mono">
                              {pr.code}
                            </span>
                          </td>
                          <td className="p-3.5 font-bold text-emerald-400 font-mono text-sm">
                            {pr.discountPercent > 0 ? `-${pr.discountPercent}%` : `-${pr.discountAmount} ₴`}
                          </td>
                          <td className="p-3.5 text-zinc-300 font-mono">
                            {pr.minOrderSum > 0 ? `${pr.minOrderSum} ₴` : 'Без ліміту'}
                          </td>
                          <td className="p-3.5 text-zinc-400 font-mono">
                            {pr.usageCount} / {pr.maxUsages ? pr.maxUsages : '∞'}
                          </td>
                          <td className="p-3.5 font-mono text-zinc-400">
                            {pr.expiryDate ? (
                              <span className={isExpired ? 'text-red-400 line-through' : 'text-zinc-300'}>
                                {new Date(pr.expiryDate).toLocaleDateString()}
                              </span>
                            ) : (
                              'Безстроково'
                            )}
                          </td>
                          <td className="p-3.5">
                            <button
                              type="button"
                              onClick={() => handleTogglePromo(pr.id)}
                              className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border cursor-pointer ${
                                pr.isActive && !isExpired
                                  ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
                                  : 'bg-zinc-900 border-zinc-700 text-zinc-500'
                              }`}
                            >
                              {pr.isActive && !isExpired ? '● АКТИВНИЙ' : '○ ВИМКНЕНО'}
                            </button>
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeletePromo(pr.id, pr.code)}
                              className="border border-red-900/50 bg-red-950/20 hover:bg-red-900/40 text-red-400 px-2.5 py-1 text-xs cursor-pointer"
                              title="Видалити промокод"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center text-zinc-500 text-xs">
                  Промокодів поки немає. Створіть перший промокод у формі вище.
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Модальное окно добавления сотрудника */}
      {showStaffModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-zinc-800 w-full max-w-md p-6 space-y-4 font-mono animate-fade-in">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h3 className="text-white font-bold uppercase text-xs">Добавить сотрудника</h3>
              <button onClick={() => setShowStaffModal(false)} className="text-zinc-500 hover:text-white">✕</button>
            </div>

            {staffMsg && (
              <div className="bg-red-950/40 border border-red-800 text-red-400 p-2 text-xs">
                {staffMsg}
              </div>
            )}

            <form onSubmit={handleCreateStaff} className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-500 block mb-1">Имя сотрудника</label>
                <input
                  type="text"
                  required
                  value={staffForm.name}
                  onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                  className="w-full bg-black border border-zinc-800 p-2 text-white outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="text-zinc-500 block mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={staffForm.email}
                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  className="w-full bg-black border border-zinc-800 p-2 text-white outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="text-zinc-500 block mb-1">Пароль</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={staffForm.password}
                  onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                  className="w-full bg-black border border-zinc-800 p-2 text-white outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="text-zinc-500 block mb-1">Назначаемая роль</label>
                <select
                  value={staffForm.role}
                  onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                  className="w-full bg-black border border-zinc-800 p-2 text-white outline-none focus:border-zinc-500 cursor-pointer"
                >
                  <option value="Staff">Staff (Менеджер склада/заказов)</option>
                  <option value="Admin">Admin (Полный администратор)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStaffModal(false)}
                  className="border border-zinc-800 px-4 py-2 text-zinc-400 hover:text-white"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="bg-white text-black px-4 py-2 font-bold hover:bg-zinc-200"
                >
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
