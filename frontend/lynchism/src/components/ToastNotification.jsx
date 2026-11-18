import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export const triggerToast = (message, options = {}) => {
  window.dispatchEvent(new CustomEvent("showToast", {
    detail: { message, ...options }
  }));
};

export default function ToastNotification() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let timer = null;
    const handleToast = (e) => {
      setToast(e.detail);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        setToast(null);
      }, 4000);
    };

    window.addEventListener("showToast", handleToast);
    return () => {
      window.removeEventListener("showToast", handleToast);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!toast) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] font-mono animate-fade-in max-w-sm w-full">
      <div className="bg-[#0b0b0b] border border-zinc-700 text-white p-4 shadow-2xl flex items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[9px] text-zinc-500 uppercase tracking-widest block font-bold">
            HUD_ALERT // SYSTEM_NOTIFICATION
          </span>
          <p className="text-xs uppercase tracking-wider text-zinc-200">
            {toast.message}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {toast.linkUrl && (
            <Link
              to={toast.linkUrl}
              onClick={() => setToast(null)}
              className="bg-white text-black text-[10px] font-black uppercase px-3 py-1.5 hover:bg-zinc-300 transition-colors"
            >
              {toast.linkText || "VIEW"}
            </Link>
          )}
          <button
            onClick={() => setToast(null)}
            className="text-zinc-600 hover:text-white text-xs uppercase"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
