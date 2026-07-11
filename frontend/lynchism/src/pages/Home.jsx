import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home(){
  const navigate = useNavigate()
  return (
    <>
      <div className="relative w-full h-[500px] overflow-hidden border-y border-zinc-900">
        <div className="absolute inset-0 bg-black/60 z-10"></div>

        <img 
          src="https://i.ibb.co/t5SBjSQ/PLOHOYPAREN-online-video-cutter-com-2.gif" 
          alt="visual"
          className="w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <button onClick={() => navigate("/catalog")} className="border border-white text-white px-8 py-3 uppercase tracking-[0.3em] text-xs hover:bg-white hover:text-black transition-all">
            View_Collection
          </button>
        </div>
      </div>
    </>
  );
}
