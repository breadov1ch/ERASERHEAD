import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import { useTranslation } from '../i18n';
import { triggerToast } from './ToastNotification';
import { playClickSound } from '../soundEffects';

const GOOGLE_CLIENT_ID = "591447045837-afqvj278tr1k82gr97qhk4jr6ilkb1t2.apps.googleusercontent.com";

export default function GoogleAuthButton({ onError, onSuccess, text = "signin" }) {
  const navigate = useNavigate();
  const { lang, loc } = useTranslation();
  const [loading, setLoading] = useState(false);
  const googleBtnContainerRef = useRef(null);

  const handleCredentialResponse = async (response) => {
    if (!response || !response.credential) {
      if (onError) onError(loc("Не вдалося отримати дані від Google", "Failed to get data from Google", "Не удалось получить данные от Google"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/Client/google-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: response.credential })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || loc("Помилка авторизації через Google", "Google authorization failed", "Ошибка авторизации через Google"));
      }

      localStorage.setItem("access_token", data.accessToken);
      localStorage.setItem("refresh_token", data.refreshToken);
      localStorage.setItem("token_timestamp", String(Date.now()));
      window.dispatchEvent(new Event("authChanged"));

      const userName = data.user?.name || "User";
      triggerToast(loc(
        `Ласкаво просимо, ${userName}!`,
        `Welcome, ${userName}!`,
        `Добро пожаловать, ${userName}!`
      ));

      if (onSuccess) {
        onSuccess(data);
      } else {
        navigate("/");
      }
    } catch (err) {
      console.error("Google login error:", err);
      const msg = err.message || loc("Помилка входу через Google", "Google sign-in error", "Ошибка входа через Google");
      if (onError) onError(msg);
      else triggerToast(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initializeGoogle = () => {
      if (!window.google?.accounts?.id) return;

      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true
        });

        // Рендерим скрытый стандартный Google Button для резервного клика
        if (googleBtnContainerRef.current) {
          googleBtnContainerRef.current.innerHTML = "";
          window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
            theme: "filled_black",
            size: "large",
            type: "standard",
            shape: "rectangular",
            text: text === "signup" ? "signup_with" : "signin_with",
            width: googleBtnContainerRef.current.offsetWidth || 300,
            locale: lang === "ua" ? "uk" : lang === "ru" ? "ru" : "en"
          });
        }
      } catch (e) {
        console.warn("Failed to initialize Google Auth:", e);
      }
    };

    if (window.google?.accounts?.id) {
      initializeGoogle();
    } else {
      const existingScript = document.getElementById("google-gsi-client");
      if (!existingScript) {
        const script = document.createElement("script");
        script.id = "google-gsi-client";
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = initializeGoogle;
        document.body.appendChild(script);
      } else {
        existingScript.addEventListener("load", initializeGoogle);
      }
    }
  }, [lang, text]);

  const handleCustomButtonClick = () => {
    playClickSound();
    if (loading) return;

    if (window.google?.accounts?.id) {
      // Пытаемся вызвать prompt One Tap или программный клик по отрисованной кнопке
      try {
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            // Если One Tap заблокирован или скрыт, кликаем по внутренней кнопке Google
            const innerBtn = googleBtnContainerRef.current?.querySelector('[role="button"]') ||
                             googleBtnContainerRef.current?.querySelector('div[tabindex="0"]');
            if (innerBtn) {
              innerBtn.click();
            }
          }
        });
      } catch {
        const innerBtn = googleBtnContainerRef.current?.querySelector('[role="button"]') ||
                         googleBtnContainerRef.current?.querySelector('div[tabindex="0"]');
        if (innerBtn) {
          innerBtn.click();
        }
      }
    }
  };

  return (
    <div className="w-full font-mono">
      {/* Скрытый нативный контейнер для надежного триггера */}
      <div 
        ref={googleBtnContainerRef} 
        className="hidden" 
        aria-hidden="true" 
      />

      {/* Фирменная брутальная кнопка ERASERHEAD в едином стиле сайта */}
      <button
        type="button"
        disabled={loading}
        onClick={handleCustomButtonClick}
        className="w-full py-3.5 px-4 bg-[#141414] hover:bg-[#1f1f1f] border border-zinc-700 hover:border-zinc-300 text-white flex items-center justify-center gap-3 transition-all cursor-pointer group active:scale-[0.99] shadow-md disabled:opacity-50"
      >
        {/* Аутентичный SVG логотип Google */}
        <svg className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>

        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-200 group-hover:text-white">
          {loading
            ? loc('ЗВ\'ЯЗОК З GOOGLE...', 'CONNECTING TO GOOGLE...', 'СВЯЗЬ С GOOGLE...')
            : text === "signup"
            ? loc('ЗАРЕЄСТРУВАТИСЯ ЧЕРЕЗ GOOGLE', 'SIGN UP WITH GOOGLE', 'ЗАРЕГИСТРИРОВАТЬСЯ ЧЕРЕЗ GOOGLE')
            : loc('УВІЙТИ З ДОПОМОГОЮ GOOGLE', 'CONTINUE WITH GOOGLE', 'ВОЙТИ С ПОМОЩЬЮ GOOGLE')}
        </span>
      </button>
    </div>
  );
}
