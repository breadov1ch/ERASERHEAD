import React from 'react';
import { UserIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';
import { Link, useLocation } from 'react-router-dom';

const Header = ({ cartCount }) => {
  // Хук для отслеживания активной страницы (чтобы подсвечивать Home, Catalog или About)
  const location = useLocation();

  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'Catalog', path: '/catalog' },
    { name: 'About', path: '/about' },
  ];

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between bg-[#0a0a0a] px-6 py-4 border-b border-zinc-900 backdrop-blur-md bg-opacity-95 select-none">
      
      {/* ЛЕВАЯ ЧАСТЬ: Логотип и Навигация */}
      <div className="flex items-center gap-12">
        <Link 
          to="/" 
          className="text-white text-2xl font-black tracking-[0.08em] uppercase transition-opacity hover:opacity-80"
        >
          Eraserhead
        </Link>
        
        <nav className="flex items-center gap-8 text-[11px] font-semibold tracking-[0.15em] uppercase">
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

      {/* ПРАВАЯ ЧАСТЬ: Профиль и Корзина */}
      <div className="flex items-center gap-6">
        <Link 
          to="/profile" 
          className="text-zinc-400 hover:text-white transition-colors duration-300 p-1"
          aria-label="Profile"
        >
          <UserIcon className="w-5 h-5 stroke-[1.2]" />
        </Link>

        <Link 
          to="/cart" 
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
      </div>

    </header>
  );
};

export default Header;