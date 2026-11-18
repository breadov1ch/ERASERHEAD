import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { refreshTokens } from '../api';
import { API_URL } from '../config';
import { useTranslation } from '../i18n';
import { useCurrency } from '../currency';
import { getGuestCart, updateGuestCartQuantity, removeFromGuestCart } from '../cartManager';
import { triggerToast } from '../components/ToastNotification';

export default function CartPage({ removeItem }) {
  const navigate = useNavigate();
  const { t, lang, loc } = useTranslation();
  const { formatPrice } = useCurrency();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCart = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setCartItems(getGuestCart());
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let response = await fetch(`${API_URL}/Cart/get-cart`, {
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
          response = await fetch(`${API_URL}/Cart/get-cart`, {
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
        setCartItems(data);
      } else {
        // Fallback to guest cart if server fails
        setCartItems(getGuestCart());
      }
    } catch (err) {
      console.error("Cart fetch error:", err);
      setCartItems(getGuestCart());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();

    const handleSync = () => {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setCartItems(getGuestCart());
      }
    };
    window.addEventListener("cartUpdated", handleSync);
    return () => window.removeEventListener("cartUpdated", handleSync);
  }, []);

  const handleChangeCount = async (id, num) => {
    const targetItem = cartItems.find(it => it.id === id);
    if (!targetItem) return false;

    // Проверка лимита склада при увеличении
    if (num > targetItem.quantity && !targetItem.isPreOrder && targetItem.maxStock !== undefined && num > targetItem.maxStock) {
      triggerToast(`${t("cart_stock_limit_reached")} (${targetItem.maxStock} шт.)`);
      return false;
    }

    const token = localStorage.getItem("access_token");
    if (!token) {
      const updated = updateGuestCartQuantity(id, num);
      setCartItems(updated);
      if (removeItem) removeItem();
      return true;
    }

    try {
      let response = await fetch(`${API_URL}/Cart/change-quantity?id=${id}&quantity=${num}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        const isRefreshed = await refreshTokens();
        if (isRefreshed) {
          const freshToken = localStorage.getItem("access_token");
          response = await fetch(`${API_URL}/Cart/change-quantity?id=${id}&quantity=${num}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${freshToken}`
            }
          });
        }
      }

      if (response.ok) {
        setCartItems(prev => prev.map(item => item.id === id ? { ...item, quantity: num } : item));
        if (removeItem) removeItem();
        return true;
      } else {
        triggerToast(t("cart_stock_limit_reached"));
      }
    } catch (err) {
      console.error("Error changing count:", err);
      triggerToast(t("cart_stock_limit_reached"));
    }
    return false;
  };

  const handleRemove = async (id) => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      const updated = removeFromGuestCart(id);
      setCartItems(updated);
      if (removeItem) removeItem();
      return;
    }

    setCartItems(prev => prev.filter(item => item.id !== id));
    try {
      let response = await fetch(`${API_URL}/Cart/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        const isRefreshed = await refreshTokens();
        if (isRefreshed) {
          const freshToken = localStorage.getItem("access_token");
          response = await fetch(`${API_URL}/Cart/${id}`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${freshToken}`
            }
          });
        }
      }
    } catch (err) {
      console.error("Error removing item:", err);
    }

    if (removeItem) removeItem();
  };

  const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const shipping = 0;
  const tax = 0;
  const total = subtotal;

  return (
    <div className='bg-[#131313] min-h-screen p-6 sm:p-12 text-white'>
      <div className="max-w-[1700px] mx-auto">
        <div className="mb-8 border-b border-zinc-700 pb-6">
          <h1 className="text-white text-3xl sm:text-5xl font-black tracking-tight uppercase">
            {t("cart_title")}
          </h1>
          <p className="text-zinc-400 text-xs uppercase tracking-[0.25em] mt-2 font-mono">
            ARCHIVE // 2026 // SELECTION
          </p>
        </div>

        <div className='lg:flex gap-10 w-full'>
          {/* Список товаров */}
          <div className='flex-grow min-h-[400px]'>
            {loading ? (
              Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className='flex border border-zinc-700 p-4 mb-3 animate-pulse bg-[#181818]'>
                  <div className='w-[120px] aspect-[4/3] bg-zinc-800 mr-4 rounded-none' />
                  <div className='flex flex-col justify-between w-full py-1'>
                    <div className='flex justify-between w-full'>
                      <div className='flex flex-col gap-2 w-2/3'>
                        <div className='h-3 bg-zinc-800 w-1/3' />
                        <div className='h-5 bg-zinc-700 w-3/4' />
                        <div className='h-3 bg-zinc-800 w-1/4' />
                      </div>
                      <div className='h-5 bg-zinc-700 w-16' />
                    </div>
                  </div>
                </div>
              ))
            ) : cartItems.length > 0 ? (
              cartItems.map((item) => {
                const displayName = item.productName || item.name || "ARCHIVE ITEM";
                const displayImg = (!item.imageURL || item.imageURL.includes('ibb.co')) 
                  ? 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1000&q=85' 
                  : item.imageURL;

                return (
                  <div key={item.id} className='flex text-white mb-3 border border-zinc-700 bg-[#181818] p-4 hover:border-zinc-400 transition-colors shadow-md'>
                    <div className="shrink-0 mr-4 w-[110px] sm:w-[130px] aspect-[4/5] bg-[#111111] overflow-hidden border border-zinc-700/80">
                      <img 
                        src={displayImg} 
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1000&q=85';
                        }}
                        className='w-full h-full object-cover rounded-none' 
                        alt={displayName} 
                      />
                    </div>

                    <div className='flex flex-col justify-between w-full'>
                      <div className='flex justify-between w-full gap-4'>
                        <div className='flex flex-col'>
                          <span className='text-[9px] tracking-[0.25em] text-zinc-400 font-mono uppercase'>
                            ITEM // {item.productId || item.id}
                          </span>
                          <span className='text-base sm:text-lg tracking-tight uppercase text-white font-bold mt-1'>
                            {displayName}
                          </span>
                          <div className='flex flex-wrap items-center gap-2 uppercase text-xs font-mono text-zinc-400 mt-1'>
                            <span>SIZE: <strong className="text-white">{item.size || "ONE SIZE"}</strong></span>
                            {item.color && (
                              <span>• COLOR: <strong className="text-white">{item.color}</strong></span>
                            )}
                          </div>
                          {item.isPreOrder && (
                            <span className="text-[9px] px-2 py-0.5 bg-zinc-900 text-zinc-300 border border-zinc-700 font-mono uppercase tracking-wider font-bold inline-block w-fit mt-1">
                              ★ {t("preorder_badge")}
                            </span>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <span className='text-white text-base sm:text-xl font-mono font-bold'>
                            {formatPrice(item.price)}
                          </span>
                        </div>
                      </div>

                      <div className='flex items-center justify-between gap-6 mt-4 pt-3 border-t border-zinc-700/60'>
                        <div className='flex items-center bg-[#111111] border border-zinc-700 h-8'>
                          <button 
                            onClick={() => {
                              if (item.quantity > 1) handleChangeCount(item.id, item.quantity - 1);
                            }} 
                            className='flex items-center justify-center w-8 h-full hover:bg-zinc-800 transition-colors text-zinc-300 hover:text-white border-r border-zinc-700 cursor-pointer font-mono'
                          >
                            -
                          </button>
                          <span className='text-white text-xs px-3 font-mono font-bold min-w-[32px] text-center'>
                            {item.quantity}
                          </span>
                          {(() => {
                            const isAtStockLimit = !item.isPreOrder && item.maxStock !== undefined && item.quantity >= item.maxStock;
                            return (
                              <button 
                                disabled={isAtStockLimit}
                                onClick={() => {
                                  if (isAtStockLimit) {
                                    triggerToast(`${t("cart_stock_limit_reached")} (${item.maxStock} шт.)`);
                                    return;
                                  }
                                  handleChangeCount(item.id, item.quantity + 1);
                                }} 
                                className={`flex items-center justify-center w-8 h-full transition-colors border-l border-zinc-700 font-mono ${
                                  isAtStockLimit 
                                    ? 'opacity-25 text-zinc-600 cursor-not-allowed bg-zinc-900' 
                                    : 'hover:bg-zinc-800 text-zinc-300 hover:text-white cursor-pointer'
                                }`}
                                title={isAtStockLimit ? t("cart_stock_limit_reached") : ""}
                              >
                                +
                              </button>
                            );
                          })()}
                        </div>

                        <button 
                          onClick={() => handleRemove(item.id)}
                          className='text-zinc-400 hover:text-red-400 text-[10px] uppercase tracking-[0.2em] transition-colors underline underline-offset-4 cursor-pointer font-mono'
                        >
                          {t("cart_remove")}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[350px] border border-dashed border-zinc-700 bg-[#181818] p-8 shadow-md">
                <span className="text-zinc-400 text-xs uppercase tracking-[0.25em] mb-4 font-mono">
                  {t("cart_empty")}
                </span>
                <button 
                  onClick={() => navigate("/catalog")} 
                  className="bg-white text-black px-6 py-3 uppercase tracking-[0.2em] text-xs font-black hover:bg-zinc-300 transition-colors cursor-pointer"
                >
                  {t("cart_explore")}
                </button>
              </div>
            )}
          </div>

          {/* Сводка заказа */}
          <div className='bg-[#181818] text-zinc-200 p-8 lg:w-[480px] border border-zinc-700 flex flex-col justify-between h-fit lg:sticky lg:top-24 mt-6 lg:mt-0 shadow-xl'>
            <div>
              <h2 className="uppercase text-lg tracking-[0.15em] font-bold mb-8 border-b border-zinc-900 pb-3">
                {t("cart_summary")}
              </h2>

              {/* Прогресс / Индикатор бесплатной доставки */}
              {subtotal >= 2000 ? (
                <div className="mb-6 p-3 bg-emerald-950/40 border border-emerald-500/60 text-emerald-300 text-xs font-mono flex items-center gap-2">
                  <span className="text-base">✓</span>
                  <span className="font-bold uppercase tracking-wider text-[11px]">
                    {loc(
                      'БЕЗКОШТОВНА ДОСТАВКА АКТИВОВАНА (при 100% оплаті онлайн)',
                      'FREE SHIPPING ACTIVATED (with 100% online payment)',
                      'БЕСПЛАТНАЯ ДОСТАВКА АКТИВИРОВАНА (при 100% оплате онлайн)'
                    )}
                  </span>
                </div>
              ) : subtotal > 0 && (
                <div className="mb-6 p-3 bg-[#141414] border border-zinc-800 text-zinc-400 text-[11px] font-mono space-y-1.5">
                  <div className="flex justify-between uppercase">
                    <span>{loc('До безкоштовної доставки:', 'For free shipping:', 'До бесплатной доставки:')}</span>
                    <span className="text-white font-bold">{loc(`ще ${2000 - subtotal} ₴`, `add ${2000 - subtotal} ₴`, `еще ${2000 - subtotal} ₴`)}</span>
                  </div>
                  <div className="w-full bg-zinc-800 h-1 overflow-hidden">
                    <div 
                      className="bg-white h-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.round((subtotal / 2000) * 100))}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-zinc-400 uppercase">
                    {loc(
                      'Діє при замовленні від 2000 ₴ та повній оплаті онлайн',
                      'Applies to orders from 2000 ₴ with 100% online payment',
                      'Действует при заказе от 2000 ₴ и полной оплате онлайн'
                    )}
                  </p>
                </div>
              )}

              <div className="space-y-4 font-mono text-xs">
                <div className="flex justify-between items-center">
                  <span className="uppercase text-zinc-500 tracking-wider">{t("cart_subtotal")}</span>
                  <span className="text-sm font-bold text-white">{formatPrice(subtotal)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="uppercase text-zinc-500 tracking-wider">{t("cart_shipping")}</span>
                  <span className="text-xs font-bold font-mono">
                    {subtotal >= 2000 ? (
                      <span className="text-emerald-400">
                        0 ₴ {loc('(БЕЗКОШТОВНО ПРИ 100% ОПЛАТІ)', '(FREE ON 100% PAYMENT)', '(БЕСПЛАТНО ПРИ 100% ОПЛАТЕ)')}
                      </span>
                    ) : (
                      <span className="text-zinc-400 uppercase">
                        {loc('ЗА ТАРИФАМИ ПЕРЕВІЗНИКА', 'CARRIER RATES', 'ПО ТАРИФАМ ПЕРЕВОЗЧИКА')}
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="uppercase text-zinc-500 tracking-wider">{t("cart_tax")}</span>
                  <span className="text-xs text-zinc-400 uppercase">{t("product_taxes_included")}</span>
                </div>

                <div className="border-t border-zinc-800 my-6 pt-6 flex justify-between items-baseline font-sans">
                  <span className="uppercase text-sm tracking-[0.2em] font-bold text-white">{t("cart_total")}</span>
                  <span className="text-2xl font-black font-mono tracking-tight text-white">{formatPrice(total)}</span>
                </div>
              </div>

              {cartItems.some(it => it.isPreOrder) && (
                <div className="mt-5 p-3.5 bg-[#141414] border border-zinc-700 text-zinc-200 text-xs font-mono space-y-1">
                  <div className="font-bold uppercase tracking-wider flex items-center gap-1.5 text-white">
                    <span className="text-zinc-400">★</span> {loc("ПРЕДЗАМОВЛЕННЯ", "PRE-ORDER", "ПРЕДЗАКАЗ")}
                  </div>
                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                    {lang === 'ua' 
                      ? "У кошику є товари за передзамовленням. Орієнтовний термін відправки: 10–14 робочих днів. Для оформлення діє повна оплата або передплата 50% (накладений платіж без передплати недоступний)."
                      : lang === 'ru'
                      ? "В корзине есть товары по предзаказу. Ориентировочный срок отправки: 10–14 рабочих дней. Действует полная оплата или предоплата 50% (наложенный платеж без предоплаты недоступен)."
                      : "Cart contains on-demand pre-order items. Estimated dispatch: 10–14 business days. Requires full payment or 50% deposit."}
                  </p>
                </div>
              )}
            </div>

            <div className="w-full mt-8">
              <button 
                disabled={cartItems.length === 0}
                onClick={() => navigate("/checkout")} 
                className="w-full bg-white text-black py-4 uppercase text-xs tracking-[0.25em] font-black hover:bg-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                {t("cart_checkout")}
              </button>
              
              <p className="text-center text-zinc-500 text-[10px] uppercase tracking-widest mt-4 font-mono leading-relaxed">
                SECURE CHECKOUT // ENCRYPTED
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
