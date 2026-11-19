import React, { useState, useEffect, useRef } from 'react';
import { UserIcon, ShoppingBagIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from './i18n';
import { useCurrency } from './currency';
import { API_URL } from './config';
import { playClickSound } from './soundEffects';

const Header = ({ cartCount }) => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const { lang, setLanguage, t, loc } = useTranslation();
  const { currency, setCurrency } = useCurrency();
  const [tickerDirection, setTickerDirection] = useState(() => {
    return localStorage.getItem("ticker_dir") || "left";
  });

  // --- ИНТЕРАКТИВНЫЙ КОНВЕЙЕР (DRAG & CONVEYOR BELT) ---
  const tickerTrackRef = useRef(null);
  const tickerHalfRef = useRef(null);
  const [isTickerDragging, setIsTickerDragging] = useState(false);
  const tickerOffsetRef = useRef(0);
  const isDraggingTickerRef = useRef(false);
  const tickerLastXRef = useRef(0);
  const tickerLastTimeRef = useRef(0);
  const tickerMomentumRef = useRef(0);
  const tickerDirectionRef = useRef(tickerDirection);

  useEffect(() => {
    tickerDirectionRef.current = tickerDirection;
  }, [tickerDirection]);

  useEffect(() => {
    let animId;
    let lastTime = performance.now();
    const baseSpeed = 44; // px / sec

    const loop = (now) => {
      const dt = Math.min(0.08, (now - lastTime) / 1000);
      lastTime = now;

      const halfW = tickerHalfRef.current?.offsetWidth || 0;

      if (tickerTrackRef.current && halfW > 0) {
        if (isDraggingTickerRef.current) {
          // Во время зажатия курсором конвейер подчиняется пальцу/мыши напрямую
        } else if (Math.abs(tickerMomentumRef.current) > 15) {
          // Плавное затухание после броска (инерция конвейера)
          tickerOffsetRef.current += tickerMomentumRef.current * dt;
          tickerMomentumRef.current *= Math.pow(0.1, dt);
        } else {
          // Стабильный непрерывный ход конвейера
          const dir = tickerDirectionRef.current === 'right' ? 1 : -1;
          tickerOffsetRef.current += dir * baseSpeed * dt;
        }

        // Бесшовное бесконечное зацикливание в обе стороны
        while (tickerOffsetRef.current <= -halfW) {
          tickerOffsetRef.current += halfW;
        }
        while (tickerOffsetRef.current > 0) {
          tickerOffsetRef.current -= halfW;
        }

        tickerTrackRef.current.style.transform = `translate3d(${tickerOffsetRef.current}px, 0, 0)`;
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleTickerStart = (clientX) => {
    isDraggingTickerRef.current = true;
    tickerLastXRef.current = clientX;
    tickerLastTimeRef.current = performance.now();
    tickerMomentumRef.current = 0;
    setIsTickerDragging(true);
  };

  const handleTickerMove = (clientX) => {
    if (!isDraggingTickerRef.current) return;
    const now = performance.now();
    const dx = clientX - tickerLastXRef.current;
    const dt = Math.max(1, now - tickerLastTimeRef.current) / 1000;

    tickerOffsetRef.current += dx;
    tickerMomentumRef.current = dx / dt;
    tickerLastXRef.current = clientX;
    tickerLastTimeRef.current = now;
  };

  const handleTickerEnd = () => {
    if (!isDraggingTickerRef.current) return;
    isDraggingTickerRef.current = false;
    setIsTickerDragging(false);

    // Если был сильный бросок конвейера, синхронизируем направление
    if (tickerMomentumRef.current > 120) {
      setTickerDirection("right");
      localStorage.setItem("ticker_dir", "right");
    } else if (tickerMomentumRef.current < -120) {
      setTickerDirection("left");
      localStorage.setItem("ticker_dir", "left");
    }
  };

  useEffect(() => {
    const onMouseMove = (e) => handleTickerMove(e.clientX);
    const onMouseUp = () => handleTickerEnd();
    const onTouchMove = (e) => {
      if (e.touches && e.touches[0]) handleTickerMove(e.touches[0].clientX);
    };
    const onTouchEnd = () => handleTickerEnd();

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  const fetchUser = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setUser(null);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/Client/me`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch (e) {
      setUser(null);
    }
  };

  useEffect(() => {
    fetchUser();
    const handleAuthChange = () => fetchUser();
    window.addEventListener("authChanged", handleAuthChange);
    return () => window.removeEventListener("authChanged", handleAuthChange);
  }, [location.pathname]);

  const navItems = [
    { name: t("nav_home"), path: '/' },
    { name: t("nav_catalog"), path: '/catalog' },
    { name: t("nav_about"), path: '/about' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#141414]/95 border-b border-zinc-700 backdrop-blur-md select-none transition-all duration-300 shadow-md w-full max-w-full overflow-hidden">
      {/* Бесконечный интерактивный конвейер сверху (drag & roll) */}
      <div 
        onMouseDown={(e) => {
          if (e.button === 0) handleTickerStart(e.clientX);
        }}
        onTouchStart={(e) => {
          if (e.touches && e.touches[0]) handleTickerStart(e.touches[0].clientX);
        }}
        onDragStart={(e) => e.preventDefault()}
        title={loc(
          `Конвеєр: потягніть мишею або пальцем`,
          `Conveyor belt: drag with cursor or touch`,
          `Конвейер: потяните мышью или пальцем`
        )}
        className={`w-full bg-[#181818] border-b border-zinc-700/80 py-1.5 overflow-hidden select-none whitespace-nowrap relative group transition-colors hover:bg-[#202020] ${
          isTickerDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{ userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'pan-y' }}
      >
        {/* Движущаяся лента конвейера с аппаратным ускорением */}
        <div 
          ref={tickerTrackRef}
          className="flex items-center text-[10px] sm:text-[11px] font-bold tracking-[0.25em] text-zinc-300 uppercase font-mono pointer-events-none will-change-transform"
        >
          {/* Первая половина ленты (для замера ширины) */}
          <div ref={tickerHalfRef} className="flex shrink-0 items-center gap-8 pr-8">
            <span>{t("home_ticker")}</span>
            <span>{t("home_ticker")}</span>
            <span>{t("home_ticker")}</span>
          </div>

          {/* Вторая дублирующая половина для бесшовного зацикливания */}
          <div className="flex shrink-0 items-center gap-8 pr-8">
            <span>{t("home_ticker")}</span>
            <span>{t("home_ticker")}</span>
            <span>{t("home_ticker")}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-3 sm:px-8 py-3 sm:py-3.5 max-w-[1700px] mx-auto w-full">
        
        {/* ЛЕВАЯ ЧАСТЬ: Логотип и Навигация */}
        <div className="flex items-center gap-8 lg:gap-12">
          <Link 
            to="/" 
            onClick={() => setIsOpen(false)}
            className="text-white text-xl sm:text-2xl font-black tracking-[0.1em] uppercase hover:opacity-80 transition-opacity"
          >
            ERASERHEAD
          </Link>
          
          {/* Десктопная навигация */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-bold tracking-[0.15em] uppercase">
            {navItems.map((item) => {
              const currentFull = location.pathname + location.search;
              const isActive = item.path === '/' 
                ? location.pathname === '/' 
                : item.path.includes('?') 
                  ? currentFull === item.path 
                  : location.pathname === item.path && !location.search;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`transition-colors duration-200 ${
                    isActive ? 'text-white border-b-2 border-white pb-0.5' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}

            {/* Быстрый доступ к админке для персонала */}
            {user && (user.role === 'Admin' || user.role === 'Staff' || user.role === 'Manager') && (
              <Link
                to="/admin"
                className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 border border-zinc-700 text-zinc-300 hover:text-white hover:border-white transition-colors bg-zinc-950 font-mono"
              >
                [ADMIN_PANEL]
              </Link>
            )}
          </nav>
        </div>

        {/* ПРАВАЯ ЧАСТЬ: Валюта, Язык, Профиль, Корзина, Бургер */}
        <div className="flex items-center gap-3 sm:gap-5">
          {/* Переключатель валюты (UAH | USD | EUR) */}
          <div className="hidden md:flex items-center border border-zinc-800 bg-[#0d0d0d] text-[10px] tracking-wider font-bold">
            {['UAH', 'USD', 'EUR'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                className={`px-2 py-1 uppercase transition-colors cursor-pointer ${
                  currency === c ? 'bg-zinc-200 text-black font-black' : 'text-zinc-500 hover:text-zinc-200'
                }`}
                title={`Валюта: ${c}`}
              >
                {c === 'UAH' ? '₴ UAH' : c === 'USD' ? '$ USD' : '€ EUR'}
              </button>
            ))}
          </div>

          {/* Быстрое переключение валюты для смартфонов в 1 тап */}
          <button
            type="button"
            onClick={() => {
              const next = currency === 'UAH' ? 'USD' : currency === 'USD' ? 'EUR' : 'UAH';
              setCurrency(next);
            }}
            className="md:hidden px-2 py-1 border border-zinc-700 bg-[#161616] text-[10px] font-mono font-bold text-zinc-200 hover:text-white cursor-pointer btn-press"
            title="Змінити валюту"
          >
            {currency === 'UAH' ? '₴ UAH' : currency === 'USD' ? '$ USD' : '€ EUR'}
          </button>

          {/* Переключатель языков (UA | RU | EN) */}
          <div className="hidden sm:flex items-center border border-zinc-800 bg-[#0d0d0d] text-[10px] tracking-widest font-bold">
            {['ua', 'ru', 'en'].map((l) => (
              <button
                key={l}
                onClick={() => setLanguage(l)}
                className={`px-2.5 py-1 uppercase transition-colors cursor-pointer ${
                  lang === l ? 'bg-white text-black font-black' : 'text-zinc-500 hover:text-zinc-200'
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Профиль / Вход */}
          {user ? (
            <Link 
              to="/profile" 
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 text-zinc-300 hover:text-white transition-colors p-1 group"
              aria-label="Profile"
            >
              <div className="w-5 h-5 rounded-none bg-zinc-800 border border-zinc-700 group-hover:border-white flex items-center justify-center text-[10px] font-bold text-white overflow-hidden">
                {user.avatarUrl ? (
                  <img 
                    src={user.avatarUrl} 
                    alt="Avatar" 
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (user.name || "U")[0].toUpperCase()
                )}
              </div>
              <span className="hidden md:inline text-[11px] uppercase tracking-wider font-bold max-w-[120px] truncate text-zinc-300 group-hover:text-white">
                {user.name}
              </span>
            </Link>
          ) : (
            <Link 
              to="/login" 
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors p-1"
              aria-label="Sign In"
            >
              <UserIcon className="w-4 h-4 stroke-[1.6]" />
              <span className="hidden md:inline text-[10px] uppercase tracking-widest font-bold">
                {t("nav_login")}
              </span>
            </Link>
          )}

          {/* Иконка корзины */}
          <Link 
            to="/cart" 
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 text-zinc-300 hover:text-white transition-colors p-1 group"
            aria-label="Shopping Bag"
          >
            <div className="relative flex items-center">
              <ShoppingBagIcon className="w-5 h-5 stroke-[1.6]" />
              {cartCount > 0 && (
                <span className="md:hidden absolute -top-1 -right-1 bg-white text-black text-[9px] font-black min-w-[14px] h-[14px] px-0.5 flex items-center justify-center font-mono leading-none">
                  {cartCount}
                </span>
              )}
            </div>
            <span className="hidden md:flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold">
              <span>{t("nav_cart")}</span>
              {cartCount > 0 && (
                <span className="text-zinc-400 group-hover:text-white font-mono font-bold">
                  ({cartCount})
                </span>
              )}
            </span>
          </Link>

          {/* Бургер меню для мобильных */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden text-zinc-300 hover:text-white p-1 cursor-pointer focus:outline-none"
            aria-label="Toggle Menu"
          >
            {isOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
          </button>
        </div>

      </div>

      {/* Мобильное выпадающее меню */}
      {isOpen && (
        <div className="lg:hidden border-t border-zinc-700 bg-[#161616]/98 px-6 py-8 space-y-6 animate-fade-in font-mono shadow-xl">
          <nav className="flex flex-col space-y-4">
            {navItems.map((item) => {
              const currentFull = location.pathname + location.search;
              const isActive = item.path === '/' 
                ? location.pathname === '/' 
                : item.path.includes('?') 
                  ? currentFull === item.path 
                  : location.pathname === item.path && !location.search;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`text-sm uppercase font-bold tracking-[0.2em] transition-colors ${
                    isActive ? 'text-white border-l-2 border-white pl-2' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}

            {user && (user.role === 'Admin' || user.role === 'Staff' || user.role === 'Manager') && (
              <Link
                to="/admin"
                onClick={() => setIsOpen(false)}
                className="text-sm uppercase font-bold tracking-[0.2em] text-white pt-2 border-t border-zinc-700"
              >
                [ADMIN_PANEL]
              </Link>
            )}
          </nav>

          {/* Переключатель валюты на мобильном */}
          <div className="pt-4 border-t border-zinc-700 flex items-center justify-between">
            <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
              {loc('Валюта:', 'Currency:', 'Валюта:')}
            </span>
            <div className="flex border border-zinc-700">
              {['UAH', 'USD', 'EUR'].map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setCurrency(c);
                  }}
                  className={`px-2.5 py-1 uppercase text-xs font-bold ${
                    currency === c ? 'bg-zinc-200 text-black' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {c === 'UAH' ? '₴ UAH' : c === 'USD' ? '$ USD' : '€ EUR'}
                </button>
              ))}
            </div>
          </div>

          {/* Переключатель языка на мобильном */}
          <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
            <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
              {loc('Мова:', 'Language:', 'Язык:')}
            </span>
            <div className="flex border border-zinc-700">
              {['ua', 'ru', 'en'].map((l) => (
                <button
                  key={l}
                  onClick={() => {
                    setLanguage(l);
                    setIsOpen(false);
                  }}
                  className={`px-3 py-1 uppercase text-xs font-bold ${
                    lang === l ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
