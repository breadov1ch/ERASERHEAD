import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const API_URL = process.env.REACT_APP_API_URL

export default function ConfirmationPage(){
  const { id } = useParams();
  const navigate = useNavigate();
  const SuccessIcon = () => {
    return (
      <div className="relative flex items-center justify-center w-32 h-32">
        <div className="absolute w-40 h-40 border border-zinc-800 rotate-[30deg]"></div>
        <div className="absolute w-40 h-40 border border-zinc-700 rotate-[15deg]"></div>
        <div className="absolute w-40 h-40 border border-zinc-500 bg-[#0d0d0d] flex items-center justify-center">
          <svg 
            width="34" 
            height="34" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="white" 
            strokeWidth="1.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className='w-full flex justify-center bg-black min-h-screen font-mono'>
      <div className='flex flex-col items-center justify-center w-full max-w-2xl px-6'>
        
        <SuccessIcon />

        <p className='mt-14 font-black tracking-[0.2em] text-white text-3xl uppercase'>
          ORDER<span className='text-zinc-600'>#{id?.padStart(6, '0')}</span> ACCEPTED
        </p>

        <div className='mt-3 w-full max-w-md text-center'>
          <p className='text-zinc-500 text-xs uppercase tracking-widest leading-relaxed'>
            Your archival acquisition has been successfully logged. 
            <br />
            Preparation for shipment has initiated.
          </p>
        </div>
        <button 
          onClick={() => navigate("/catalog")}
          className='bg-white text-black py-5 px-10 mt-7 hover:bg-zinc-200 transition-colors active:scale-95 active:bg-green-800'>
          <span className="text-[11px] font-black uppercase tracking-[0.3em]">
            Go shopping
          </span>
        </button>
      </div>
    </div>
  )
}