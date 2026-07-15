import React, { useState } from 'react';
import { UserIcon, ShoppingBagIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { Link, useLocation } from 'react-router-dom';

const Header = ({ cartCount }) => {
  // Хук для отслеживания активной страницы (чтобы подсвечивать Home, Catalog или About)
  const location = useLocation();
  
  // Состояние для открытия/закрытия мобильного меню
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'Catalog', path: '/catalog' },
    { name: 'About', path: '/about' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#0a0a0a] border-b border-zinc-900 backdrop-blur-md bg-opacity-95 select-none transition-all duration-300">
      
      {/* ОСНОВНОЙ КОНТЕЙНЕР ХЕДЕРА */}
      <div className="flex items-center justify-between px-6 py-4">
        
        {/* ЛЕВАЯ ЧАСТЬ: Логотип и Навигация (для ПК) */}
        <div className="flex items-center gap-12">
          <Link 
            to="/" 
            onClick={() => setIsOpen(false)} // Закрываем меню при клике на лого
            className="text-white text-2xl font-black tracking-[0.08em] uppercase transition-opacity hover:opacity-80"
          >
            Eraserhead
          </Link>
          
          {/* Десктопная навигация: скрыта на мобильных (hidden), видна от lg и больше */}
          <nav className="hidden lg:flex items-center gap-8 text-[11px] font-semibold tracking-[0.15em] uppercase">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`transition-colors duration-300 ${
                    isActive ? 'text-white border-b border-white pb-1' : 'text-zinc-500 hover:text-zinc-200'
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* ПРАВАЯ ЧАСТЬ: Иконки и кнопка Бургера */}
        <div className="flex items-center gap-4 sm:gap-6">
          
          {/* Иконка профиля */}
          <Link 
            to="/profile" 
            onClick={() => setIsOpen(false)}
            className="text-zinc-400 hover:text-white transition-colors duration-300 p-1"
            aria-label="Profile"
          >
            <UserIcon className="w-5 h-5 stroke-[1.2]" />
          </Link>

          {/* Иконка корзины */}
          <Link 
            to="/cart" 
            onClick={() => setIsOpen(false)}
            className="relative flex items-center text-zinc-400 hover:text-white transition-colors duration-300 p-1"
            aria-label="Cart"
          >
            <ShoppingBagIcon className="w-5 h-5 stroke-[1.2]" />
            
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[9px] font-black text-black scale-90 animate-fade-in">
                {cartCount}
              </span>
            )}
          </Link>

          {/* КНОПКА БУРГЕРА: плавная и быстрая анимация на одном месте */}
<button
  onClick={() => setIsOpen(!isOpen)}
  className="lg:hidden text-zinc-400 hover:text-white p-1 focus:outline-none relative w-8 h-8 flex items-center justify-center"
  aria-label="Toggle menu"
>
  {/* ИКОНКА КРЕСТИКА */}
  <XMarkIcon 
    className={`w-6 h-6 stroke-[1.5] absolute transition-all duration-200 ease-out
      ${isOpen 
        ? 'opacity-100 scale-100 rotate-0' 
        : 'opacity-0 scale-75 -rotate-90 pointer-events-none'
      }`} 
  />

  {/* ИКОНКА ТРЕХ ПОЛОСОК */}
  <Bars3Icon 
    className={`w-6 h-6 stroke-[1.5] absolute transition-all duration-200 ease-out
      ${isOpen 
        ? 'opacity-0 scale-75 rotate-90 pointer-events-none' 
        : 'opacity-100 scale-100 rotate-0'
      }`} 
  />
</button>
        </div>
      </div>

      <div 
        className={`lg:hidden overflow-hidden transition-all duration-350 ease-in-out border-zinc-900 bg-[#0a0a0a]
          ${isOpen ? 'max-h-60 border-t opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}
      >
        <nav className="flex flex-col px-6 py-6 gap-5 text-[12px] font-semibold tracking-[0.2em] uppercase font-mono">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)} // Закрываем меню после выбора страницы
                className={`transition-colors duration-300 py-1 ${
                  isActive ? 'text-white border-l-2 border-white pl-3' : 'text-zinc-500 hover:text-zinc-200'
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

    </header>
  );
};

export default Header;