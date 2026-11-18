import React, { useState, useEffect } from 'react';
import { useTranslation } from '../i18n';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const consent = localStorage.getItem("eraserhead_cookie_consent");
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const handleAccept = (type) => {
    localStorage.setItem("eraserhead_cookie_consent", type);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9990] bg-[#181818] border-t border-zinc-700 p-4 sm:p-5 font-mono text-zinc-300 shadow-2xl animate-fade-in">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center md:text-left">
          <span className="text-[9px] text-zinc-500 uppercase tracking-[0.3em] block">
            {t("cookie_title")}
          </span>
          <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
            {t("cookie_desc")}
          </p>
        </div>

        <div className="flex gap-3 shrink-0">
          <button
            onClick={() => handleAccept('necessary')}
            className="border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white px-4 py-2 text-[10px] uppercase tracking-widest transition-colors cursor-pointer"
          >
            {t("cookie_necessary")}
          </button>
          <button
            onClick={() => handleAccept('all')}
            className="bg-white text-black hover:bg-zinc-200 px-5 py-2 text-[10px] uppercase font-bold tracking-widest transition-colors cursor-pointer"
          >
            {t("cookie_accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
