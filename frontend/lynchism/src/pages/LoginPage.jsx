import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import loadingGif1 from '../assets/loading.gif';
import { API_URL } from '../config';
import { useTranslation } from '../i18n';
import GoogleAuthButton from '../components/GoogleAuthButton';

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { t, loc } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loginUser = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/Client/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim(), password })
      });
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(t("auth_invalid_credentials") || "Неверный email или пароль");
        }
        const text = await response.text();
        let errMsg = "Ошибка авторизации";
        try {
          const parsed = JSON.parse(text);
          errMsg = parsed.message || parsed.title || text;
        } catch {
          if (text) errMsg = text;
        }
        throw new Error(errMsg);
      }
      const data = await response.json();
      localStorage.setItem("access_token", data.accessToken);
      localStorage.setItem("refresh_token", data.refreshToken);

      navigate("/");
    } catch (err) {
      setError(typeof err === 'string' ? err : err.message || "Ошибка входа");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='min-h-screen flex justify-center bg-[#131313] flex '>
      <div className='hidden lg:flex w-full items-start justify-center flex-col px-[5%]'>
        <h1 className="font-display text-[7vw] xl:text-[115px] font-black uppercase text-white 
               tracking-[-0.06em] leading-[0.75] ml-[-0.05em]">
          ERASERHEAD
        </h1>
        <p className='max-w-[900px] font-mono text-[11px] text-zinc-500 uppercase tracking-[0.15em] leading-relaxed mt-3'>
          ARCHIVE // INDUSTRIAL APPAREL LAB. <br />
          DESIGNED & CRAFTED IN DNIPRO, UKRAINE.
        </p>
      </div>
      <div className='bg-black w-full lg:w-1/2 lg:max-w-[550px] lg:mr-[5%] flex flex-col items-start justify-center p-8 sm:p-14 xl:p-20 border border-zinc-800 shadow-2xl'>
        <h1 className='text-white text-2xl font-black uppercase tracking-[0.05em]'>
          {loc('Авторизація', 'Authentication', 'Авторизация')}
        </h1>
        <p className='text-zinc-500 uppercase tracking-[0.2em] text-[10px] font-mono mt-1'>
          {loc('Вхід до особистого кабінету', 'Identity Verification', 'Вход в личный кабинет')}
        </p>

        <form className='flex flex-col mt-8 w-full' onSubmit={loginUser}>
          <label className="font-bold text-zinc-500 text-[10px] uppercase tracking-[0.25em] block">
            {loc('Електронна пошта', 'Email Address', 'Электронная почта')}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-transparent text-zinc-200 font-mono text-sm outline-none placeholder:text-zinc-700 border-b border-zinc-700 focus:border-white py-2 transition-colors"
            placeholder="user@eraserhead.com"
            required
          />

          <label className="font-bold text-zinc-500 text-[10px] uppercase tracking-[0.25em] block mt-6">
            {loc('Пароль', 'Password', 'Пароль')}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-transparent text-zinc-200 font-mono text-sm outline-none placeholder:text-zinc-700 border-b border-zinc-700 focus:border-white py-2 transition-colors"
            placeholder="•••••••••••"
            required
          />

          {error && (
            <span className="text-red-400 text-xs mt-3 block font-mono border border-red-900/60 bg-red-950/30 p-2">
              {error}
            </span>
          )}

          <button
            type="submit"
            className="w-full bg-white text-black py-4 uppercase font-black tracking-[0.3em] text-xs hover:bg-zinc-200 transition-colors mt-8 flex items-center justify-center cursor-pointer active:scale-[0.99]"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <img src={loadingGif1} className="w-5 h-5" alt="Loading..." />
            ) :
              (t("auth_signin_btn") || loc("Увійти", "Sign In", "Войти"))
            }
          </button>

          {/* Разделитель ИЛИ */}
          <div className="relative flex items-center justify-center my-6">
            <div className="border-t border-zinc-800 w-full"></div>
            <span className="bg-black px-3 text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-500">
              {loc('АБО', 'OR', 'ИЛИ')}
            </span>
          </div>

          {/* Вход через Google красиво */}
          <GoogleAuthButton 
            text="signin" 
            onError={(msg) => setError(msg)} 
          />

          <div className="flex justify-between items-center pt-6 mt-2 border-t border-zinc-900">
            <span
              onClick={() => navigate('/forgot-password')}
              className="text-zinc-500 hover:text-white text-[10px] font-mono uppercase tracking-widest cursor-pointer transition-colors"
            >
              {t("auth_forgot_pwd") || loc("Забули пароль?", "Forgot password?", "Забыли пароль?")}
            </span>
            <span
              onClick={() => navigate(`/register`)}
              className="text-white hover:text-zinc-300 text-[10px] uppercase tracking-widest font-bold border-b border-white pb-0.5 cursor-pointer transition-colors"
            >
              {t("auth_register_btn") || loc("Реєстрація", "Register", "Регистрация")}
            </span>
          </div>
        </form>

      </div>
    </div>
  )
}