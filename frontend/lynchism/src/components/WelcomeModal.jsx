import React from 'react';
import { useTranslation } from '../i18n';

export default function WelcomeModal() {
  const { hasChosenLang, setLanguage, closeLangModal, t } = useTranslation();

  if (hasChosenLang) return null;

  return (
    <div 
      onClick={closeLangModal}
      className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fade-in"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-[#181818] border border-zinc-700 p-8 sm:p-10 max-w-md w-full text-center relative shadow-2xl space-y-6"
      >
        {/* Кнопка закрытия [✕] */}
        <button
          onClick={closeLangModal}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white text-xs font-mono tracking-widest uppercase transition-colors cursor-pointer"
          aria-label="Close"
        >
          [✕]
        </button>

        <div>
          <span className="text-[10px] text-zinc-400 uppercase tracking-[0.3em] block mb-2 font-mono">
            LOCALE_SELECTION
          </span>
          <h2 className="text-2xl font-black uppercase text-white tracking-widest">
            ERASERHEAD
          </h2>
          <p className="text-zinc-300 text-xs mt-3 uppercase tracking-wider leading-relaxed">
            {t("lang_modal_sub")}
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => setLanguage('ua')}
            className="w-full bg-[#111111] hover:bg-white hover:text-black border border-zinc-700 text-white py-3.5 px-4 uppercase text-xs font-bold tracking-[0.2em] transition-all cursor-pointer flex items-center justify-between"
          >
            <span>УКРАЇНСЬКА</span>
            <span className="text-[10px] opacity-60 font-mono">UA</span>
          </button>

          <button
            onClick={() => setLanguage('ru')}
            className="w-full bg-[#111111] hover:bg-white hover:text-black border border-zinc-700 text-white py-3.5 px-4 uppercase text-xs font-bold tracking-[0.2em] transition-all cursor-pointer flex items-center justify-between"
          >
            <span>РУССКИЙ</span>
            <span className="text-[10px] opacity-60 font-mono">RU</span>
          </button>

          <button
            onClick={() => setLanguage('en')}
            className="w-full bg-[#111111] hover:bg-white hover:text-black border border-zinc-700 text-white py-3.5 px-4 uppercase text-xs font-bold tracking-[0.2em] transition-all cursor-pointer flex items-center justify-between"
          >
            <span>ENGLISH</span>
            <span className="text-[10px] opacity-60 font-mono">EN</span>
          </button>
        </div>

        <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-mono">
          {t("lang_modal_footer")}
        </p>
      </div>
    </div>
  );
}
