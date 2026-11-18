import React from 'react';
import { Link } from 'react-router-dom';

export default function ErrorPage() {
  return (
    <div className='min-h-screen w-full flex flex-col justify-center items-center bg-[#131313] text-white font-mono p-6'>
      <div className='p-8 bg-[#181818] border border-zinc-700 max-w-md w-full text-center space-y-4 shadow-xl'>
        <span className='text-[10px] text-zinc-400 uppercase tracking-[0.4em] block'>
          SYSTEM_ERROR // 404
        </span>
        <h1 className='text-3xl font-black tracking-tight text-white'>PAGE NOT FOUND</h1>
        <p className='text-xs text-zinc-400'>Запитувану сторінку не знайдено або переміщено в архів.</p>
        <Link 
          to="/"
          className='inline-block px-6 py-2.5 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-zinc-200 transition-colors'
        >
          НА ГОЛОВНУ
        </Link>
      </div>
    </div>
  );
}