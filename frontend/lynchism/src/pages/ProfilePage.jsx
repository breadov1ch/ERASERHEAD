import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { refreshTokens } from '../api';
import { useTranslation } from '../i18n';
import { useCurrency } from '../currency';
import { API_URL } from '../config';

const AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80"
];

export default function ProfilePage() {
  const { formatPrice } = useCurrency();
  const [orders, setOrders] = useState([]);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [user, setUser] = useState({});
  const [editingNick, setEditingNick] = useState(false);
  const [newNick, setNewNick] = useState('');
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [newAvatarUrl, setNewAvatarUrl] = useState('');
  const [editingPwd, setEditingPwd] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState({ text: '', isError: false });
  const [profileMsg, setProfileMsg] = useState('');
  const [imgError, setImgError] = useState(false);

  const navigate = useNavigate();
  const { t, lang } = useTranslation();

  const fetchMe = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return navigate('/login');

    try {
      let response = await fetch(`${API_URL}/Client/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        const isRefreshed = await refreshTokens();
        if (isRefreshed) {
          const freshToken = localStorage.getItem('access_token');
          response = await fetch(`${API_URL}/Client/me`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${freshToken}`,
            },
          });
        } else {
          return navigate('/login');
        }
      }

      if (response.ok) {
        const data = await response.json();
        setUser(data);
        setNewNick(data.name || '');
        setNewAvatarUrl(data.avatarUrl || '');
        setImgError(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchOrders = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      let response = await fetch(`${API_URL}/Order/getOrders`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        const isRefreshed = await refreshTokens();
        if (isRefreshed) {
          const freshToken = localStorage.getItem('access_token');
          response = await fetch(`${API_URL}/Order/getOrders`, {
            headers: { Authorization: `Bearer ${freshToken}` }
          });
        }
      }

      if (response.ok) {
        const data = await response.json();
        setOrders(data);
        // По умолчанию раскрываем первый заказ для удобства
        if (data.length > 0 && !expandedOrderId) {
          setExpandedOrderId(data[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchMe();
    fetchOrders();
  }, [navigate]);

  const handleUpdateProfile = async (updatedFields) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/Client/update-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: updatedFields.name !== undefined ? updatedFields.name : user.name,
          avatarUrl: updatedFields.avatarUrl !== undefined ? updatedFields.avatarUrl : user.avatarUrl
        })
      });

      if (response.ok) {
        const updated = await response.json();
        setUser(updated);
        setEditingNick(false);
        setEditingAvatar(false);
        setImgError(false);
        setProfileMsg(t("profile_updated") || "Профіль успішно оновлено");
        window.dispatchEvent(new Event("authChanged"));
        setTimeout(() => setProfileMsg(''), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdMsg({ text: '', isError: false });

    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/Client/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });

      const text = await response.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        // Not JSON
      }

      if (!response.ok) {
        let msg = "Не удалось сменить пароль";
        if (typeof data === 'string') msg = data;
        else if (data?.message) msg = data.message;
        else if (data?.title) msg = data.title;
        else if (text && text.trim()) msg = text;

        const lower = msg.toLowerCase();
        if (lower.includes("current") || lower.includes("incorrect") || lower.includes("wrong") || lower.includes("неверн") || lower.includes("невірн")) {
          msg = t("profile_pwd_err_wrong_current") || "Поточний пароль введено невірно";
        }
        throw new Error(msg);
      }

      setPwdMsg({ text: t("profile_pwd_updated") || "Пароль успішно оновлено", isError: false });
      setOldPassword('');
      setNewPassword('');
      setTimeout(() => {
        setEditingPwd(false);
        setPwdMsg({ text: '', isError: false });
      }, 2500);
    } catch (err) {
      setPwdMsg({ text: typeof err === 'string' ? err : err.message || t("profile_pwd_error") || "Помилка при зміні пароля", isError: true });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.dispatchEvent(new Event("authChanged"));
    navigate('/login');
  };

  const toggleExpandOrder = (id) => {
    setExpandedOrderId(prev => prev === id ? null : id);
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <span className="border border-emerald-500/60 bg-emerald-950/40 text-emerald-400 text-[11px] px-2.5 py-0.5 tracking-wider uppercase font-mono">{t("profile_status_delivered")}</span>;
      case 'shipped':
        return <span className="border border-sky-500/60 bg-sky-950/40 text-sky-400 text-[11px] px-2.5 py-0.5 tracking-wider uppercase font-mono">{t("profile_status_in_transit")}</span>;
      default:
        return <span className="border border-amber-500/60 bg-amber-950/40 text-amber-400 text-[11px] px-2.5 py-0.5 tracking-wider uppercase font-mono">{t("profile_status_processing")}</span>;
    }
  };

  const userInitials = (user.name || user.email || "E")
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const isBrokenAvatar = !user.avatarUrl || user.avatarUrl.includes('photo-2026-03-31-20-27-30-1.jpg') || user.avatarUrl.includes('ibb.co') || imgError;

  return (
    <div className="bg-[#131313] text-zinc-100 min-h-screen py-10 px-4 sm:px-6 lg:px-8 font-mono">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Карточка пользователя */}
        <div className="bg-[#181818] border border-zinc-700 p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            
            {/* Аватарка */}
            <div className="relative group">
              <div className="w-24 h-24 sm:w-28 sm:h-28 overflow-hidden bg-[#101010] border border-zinc-700 flex items-center justify-center">
                {!isBrokenAvatar ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name || "User Avatar"}
                    onError={() => setImgError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-950 border border-zinc-800 flex items-center justify-center text-2xl font-black text-white tracking-widest">
                    {userInitials}
                  </div>
                )}
              </div>
              <button
                onClick={() => setEditingAvatar(!editingAvatar)}
                className="mt-2 text-[11px] text-zinc-500 hover:text-white transition-colors block text-center w-full uppercase tracking-wider cursor-pointer"
              >
                {t("profile_change_avatar")}
              </button>
            </div>

            {/* Имя и данные */}
            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                {editingNick ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newNick}
                      onChange={(e) => setNewNick(e.target.value)}
                      className="bg-black border border-zinc-700 text-white px-3 py-1.5 text-sm outline-none focus:border-white font-mono"
                      placeholder={t("profile_name_placeholder")}
                    />
                    <button
                      onClick={() => handleUpdateProfile({ name: newNick })}
                      className="bg-white text-black px-3 py-1.5 text-xs font-bold uppercase tracking-wider hover:bg-zinc-200"
                    >
                      {t("profile_save")}
                    </button>
                    <button
                      onClick={() => { setEditingNick(false); setNewNick(user.name); }}
                      className="text-zinc-500 text-xs hover:text-white px-2 py-1 uppercase"
                    >
                      {t("profile_cancel")}
                    </button>
                  </div>
                ) : (
                  <>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase">
                      {user.name || user.email?.split('@')[0]}
                    </h1>
                    <button
                      onClick={() => setEditingNick(true)}
                      className="text-[11px] text-zinc-400 hover:text-white transition-colors border border-zinc-800 hover:border-zinc-600 px-2.5 py-1 uppercase tracking-wider"
                    >
                      {t("profile_edit_nick")}
                    </button>
                  </>
                )}
              </div>

              <p className="text-xs text-zinc-400 tracking-wider">
                {user.email}
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-zinc-900 text-zinc-400 border border-zinc-800">
                  {user.role === 'Admin' ? t("profile_role_admin") : t("profile_role_client")}
                </span>
                {profileMsg && (
                  <span className="text-xs text-emerald-400 font-medium animate-fade-in">
                    ✓ {profileMsg}
                  </span>
                )}
              </div>

              {/* Кнопки действий */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-4">
                <button
                  onClick={() => setEditingPwd(!editingPwd)}
                  className="bg-black hover:bg-zinc-900 text-white text-xs uppercase tracking-wider px-4 py-2 border border-zinc-800 transition-colors"
                >
                  {editingPwd ? t("profile_cancel") : t("profile_change_pwd")}
                </button>
                <button
                  onClick={handleLogout}
                  className="bg-red-950/40 hover:bg-red-900/60 text-red-300 text-xs uppercase tracking-wider px-4 py-2 border border-red-900/60 transition-colors"
                >
                  {t("profile_logout")}
                </button>
              </div>
            </div>
          </div>

          {/* Форма смены аватарки */}
          {editingAvatar && (
            <div className="mt-6 pt-6 border-t border-zinc-900 space-y-4 animate-fade-in">
              <span className="text-xs uppercase tracking-wider text-zinc-400 block">
                {t("profile_avatar_select_tip")}
              </span>
              <div className="flex flex-wrap gap-3">
                {AVATAR_PRESETS.map((preset, idx) => (
                  <img
                    key={idx}
                    src={preset}
                    alt={`Preset ${idx}`}
                    onClick={() => handleUpdateProfile({ avatarUrl: preset })}
                    className="w-14 h-14 object-cover border border-zinc-800 hover:border-white cursor-pointer transition-all"
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={newAvatarUrl}
                  onChange={(e) => setNewAvatarUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="flex-1 bg-black border border-zinc-800 px-3 py-2 text-xs text-white outline-none focus:border-zinc-500 font-mono"
                />
                <button
                  onClick={() => handleUpdateProfile({ avatarUrl: newAvatarUrl })}
                  className="bg-white text-black px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-zinc-200"
                >
                  {t("profile_save")}
                </button>
              </div>
            </div>
          )}

          {/* Форма смены пароля */}
          {editingPwd && (
            <form onSubmit={handleChangePassword} className="mt-6 pt-6 border-t border-zinc-900 space-y-4 max-w-md animate-fade-in">
              <span className="text-xs uppercase tracking-wider text-zinc-300 block">
                {t("profile_change_pwd")}
              </span>

              {pwdMsg.text && (
                <div className={`p-3 text-xs uppercase tracking-wider ${
                  pwdMsg.isError 
                    ? 'bg-red-950/60 border border-red-800 text-red-200' 
                    : 'bg-emerald-950/60 border border-emerald-800 text-emerald-200'
                }`}>
                  {pwdMsg.text}
                </div>
              )}

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1 uppercase tracking-wider">{t("profile_old_pwd")}</label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder={t("profile_pwd_current_placeholder")}
                  className="w-full bg-black border border-zinc-800 px-3 py-2 text-xs text-white outline-none focus:border-zinc-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1 uppercase tracking-wider">{t("profile_new_pwd")}</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t("profile_pwd_new_placeholder")}
                  className="w-full bg-black border border-zinc-800 px-3 py-2 text-xs text-white outline-none focus:border-zinc-500 font-mono"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  className="bg-white text-black px-5 py-2 text-xs font-bold uppercase tracking-wider hover:bg-zinc-200"
                >
                  {t("profile_save")}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingPwd(false)}
                  className="bg-zinc-900 text-zinc-300 hover:text-white px-4 py-2 text-xs uppercase tracking-wider border border-zinc-800"
                >
                  {t("profile_cancel")}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Секция заказов */}
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
            <h2 className="text-base font-black uppercase tracking-wider text-white">
              {t("profile_orders")} ({orders.length})
            </h2>
            <span className="text-[11px] text-zinc-500 uppercase tracking-wider">
              {t("profile_order_click_tip")}
            </span>
          </div>

          {orders.length > 0 ? (
            <div className="space-y-3">
              {orders.map((order) => {
                const isExpanded = expandedOrderId === order.id;
                const dateLocale = lang === 'ua' ? 'uk-UA' : (lang === 'en' ? 'en-US' : 'ru-RU');
                const formattedDate = new Date(order.date).toLocaleDateString(dateLocale, {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                });

                return (
                  <div
                    key={order.id}
                    className="bg-[#181818] border border-zinc-700 hover:border-zinc-500 transition-colors shadow-md"
                  >
                    {/* Заголовок заказа */}
                    <div
                      onClick={() => toggleExpandOrder(order.id)}
                      className="p-5 flex flex-wrap items-center justify-between gap-4 cursor-pointer select-none"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-white tracking-widest">
                            #{order.id.toString().padStart(6, '0')}
                          </span>
                          {getStatusBadge(order.status)}
                        </div>
                        <span className="text-[11px] text-zinc-400 block uppercase tracking-wider">
                          Дата: {formattedDate}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="text-sm sm:text-base font-bold text-white tracking-wider">
                          {formatPrice(order.totalSum)}
                        </span>
                        <span className={`text-zinc-400 text-xs transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                          ▼
                        </span>
                      </div>
                    </div>

                    {/* Развернутые детали заказа */}
                    {isExpanded && (
                      <div className="border-t border-zinc-700 bg-[#141414] p-5 space-y-6 animate-fade-in">
                        
                        {/* Список товаров */}
                        <div>
                          <span className="text-[10px] text-zinc-400 uppercase tracking-widest block mb-3 font-bold">
                            {t("profile_order_items_title")}
                          </span>
                          <div className="divide-y divide-zinc-800 border border-zinc-700 bg-[#101010]">
                            {order.items && order.items.length > 0 ? (
                              order.items.map((item, idx) => (
                                <div key={idx} className="p-4 flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-4">
                                    <div className="w-14 h-16 sm:w-16 sm:h-20 bg-zinc-950 border border-zinc-800 flex-shrink-0 flex items-center justify-center">
                                      {item.imageURL ? (
                                        <img
                                          src={(!item.imageURL || item.imageURL.includes('ibb.co')) ? 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1000&q=85' : item.imageURL}
                                          alt={item.productName}
                                          onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1000&q=85';
                                          }}
                                          className="w-full h-full object-contain"
                                        />
                                      ) : (
                                        <span className="text-[10px] text-zinc-600 uppercase">Item</span>
                                      )}
                                    </div>
                                    <div>
                                      <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                                        {item.productName}
                                      </h3>
                                      <div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-400">
                                        <span>{t("product_size")} <strong className="text-white">{item.size}</strong></span>
                                        <span>{t("cart_qty") || "Кількість"}: <strong className="text-white">{item.quantity} {t("items_count")}</strong></span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-xs sm:text-sm font-bold text-white block">
                                      {formatPrice(item.price * item.quantity)}
                                    </span>
                                    <span className="text-[10px] text-zinc-600">
                                      {formatPrice(item.price)} / {t("items_piece")}
                                    </span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="p-4 text-xs text-zinc-600 uppercase tracking-wider">
                                {t("profile_order_details_pending") || "—"}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Данные доставки и оплаты */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-800 text-xs">
                          {order.streetAddress && (
                            <div className="space-y-1">
                              <span className="text-zinc-500 uppercase tracking-wider text-[10px] block">{t("profile_order_delivery_addr")}</span>
                              <p className="text-zinc-200">{order.streetAddress}</p>
                            </div>
                          )}
                          {order.phone && (
                            <div className="space-y-1">
                              <span className="text-zinc-500 uppercase tracking-wider text-[10px] block">{t("profile_order_phone")}</span>
                              <p className="text-zinc-200">{order.phone}</p>
                            </div>
                          )}
                          {order.paymentMethod && (
                            <div className="space-y-1">
                              <span className="text-zinc-500 uppercase tracking-wider text-[10px] block">{t("profile_order_payment_method")}</span>
                              <p className="text-zinc-200">{order.paymentMethod}</p>
                            </div>
                          )}
                          <div className="space-y-1">
                            <span className="text-zinc-500 uppercase tracking-wider text-[10px] block">{t("profile_order_total")}</span>
                            <p className="text-white font-bold text-sm">
                              {formatPrice(order.totalSum)}
                            </p>
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-10 border border-zinc-700 bg-[#181818] text-center space-y-4 shadow-md">
              <p className="text-xs text-zinc-400 uppercase tracking-wider">{t("profile_orders_empty")}</p>
              <button
                onClick={() => navigate('/catalog')}
                className="bg-white text-black px-6 py-2.5 text-xs font-black uppercase tracking-widest hover:bg-zinc-200 transition-colors"
              >
                {t("profile_to_catalog")}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
