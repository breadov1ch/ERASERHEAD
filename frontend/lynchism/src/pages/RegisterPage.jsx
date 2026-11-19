import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import loadingGif1 from '../assets/loading.gif';
import { useTranslation } from '../i18n';
import { API_URL } from '../config';
import VerificationCodeInput from '../components/VerificationCodeInput';
import { triggerToast } from '../components/ToastNotification';
import GoogleAuthButton from '../components/GoogleAuthButton';

export default function RegisterPage() {
  const [step, setStep] = useState(1); // 1 = Registration form, 2 = Code verification, 3 = Success
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const navigate = useNavigate();
  const { t, loc } = useTranslation();

  // Таймер обратного отсчета для повторной отправки кода
  useEffect(() => {
    let timer = null;
    if (step === 2 && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, countdown]);

  // ШАГ 1: Запрос кода подтверждения
  const handleRequestCode = async (e) => {
    e.preventDefault();
    setError('');

    if (password && password.length < 6) {
      setError(t("auth_password_short") || loc('Пароль повинен містити щонайменше 6 символів', 'Password must be at least 6 characters', 'Пароль должен содержать минимум 6 символов'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("auth_passwords_mismatch") || loc('Введені паролі не співпадають', 'Passwords do not match', 'Введенные пароли не совпадают'));
      return;
    }

    setLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const payload = {
        name: name.trim() || email.split('@')[0],
        email: email.trim(),
        password: password.trim() || null
      };

      const response = await fetch(`${API_URL}/Client/send-register-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const text = await response.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        // Not JSON
      }

      if (!response.ok) {
        let msg = loc("Помилка відправки коду. Перевірте введені дані.", "Error sending code. Check your details.", "Ошибка отправки кода. Проверьте введенные данные.");
        if (typeof data === "string") {
          msg = data;
        } else if (data?.message) {
          msg = data.message;
        } else if (data?.title) {
          msg = data.title;
        } else if (text && text.trim()) {
          msg = text;
        }

        if (msg.toLowerCase().includes("already exists") || 
            msg.toLowerCase().includes("вже") || 
            msg.toLowerCase().includes("зареєстровано") ||
            msg.toLowerCase().includes("уже существует")) {
          msg = t("auth_user_exists") || loc("Користувач з такою поштою вже зареєстрований.", "User with this email already registered.", "Пользователь с такой почтой уже зарегистрирован.");
        }
        throw new Error(msg);
      }

      triggerToast(t("auth_code_sent_toast") || loc("Код підтвердження надіслано на вашу пошту", "Verification code sent to your email", "Код подтверждения отправлен на вашу почту"));
      setCountdown(60);
      setCanResend(false);
      setCode('');
      setStep(2);
    } catch (err) {
      setError(typeof err === 'string' ? err : err.message || loc("Помилка створення акаунта", "Account creation error", "Ошибка создания аккаунта"));
    } finally {
      setLoading(false);
    }
  };

  // ШАГ 2: Подтверждение 6-значного кода
  const handleVerifyCode = async (codeToVerify) => {
    const finalCode = (codeToVerify || code).trim();
    if (finalCode.length < 6) {
      setError(loc("Введіть повний 6-значний код безпеки", "Enter full 6-digit security code", "Введите полный 6-значный код безопасности"));
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/Client/verify-register-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          code: finalCode
        })
      });

      const text = await response.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        // Not JSON
      }

      if (!response.ok) {
        let msg = loc("Невірний код або термін його дії минув.", "Invalid code or expired.", "Неверный код или срок его действия истек.");
        if (typeof data === "string") msg = data;
        else if (data?.message) msg = data.message;
        else if (data?.title) msg = data.title;
        else if (text && text.trim()) msg = text;
        throw new Error(msg);
      }

      // Сохраняем токены
      if (data?.accessToken) {
        localStorage.setItem("access_token", data.accessToken);
      }
      if (data?.refreshToken) {
        localStorage.setItem("refresh_token", data.refreshToken);
      }

      window.dispatchEvent(new Event("authChanged"));
      triggerToast(t("auth_registration_success") || loc("Реєстрація успішна! Ласкаво просимо.", "Registration successful! Welcome.", "Регистрация успешна! Добро пожаловать."));
      setStep(3);

      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (err) {
      setError(typeof err === 'string' ? err : err.message || loc("Помилка перевірки коду", "Code verification error", "Ошибка проверки кода"));
    } finally {
      setLoading(false);
    }
  };

  // Повторная отправка кода
  const handleResend = async () => {
    if (!canResend || loading) return;
    setError('');
    setLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const payload = {
        name: name.trim() || email.split('@')[0],
        email: email.trim(),
        password: password.trim() || null
      };

      const res = await fetch(`${API_URL}/Client/send-register-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || loc('Не вдалося повторно надіслати код', 'Failed to resend code', 'Не удалось повторно отправить код'));
      }

      triggerToast(t("auth_code_sent_toast") || loc("Новий код надіслано на вашу пошту", "New code sent to your email", "Новый код отправлен на вашу почту"));
      setCountdown(60);
      setCanResend(false);
      setCode('');
    } catch (err) {
      setError(err.message || loc('Помилка надсилання коду', 'Error sending code', 'Ошибка отправки кода'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen flex justify-center bg-[#131313] flex'>
      {/* ЛЕВАЯ ЧАСТЬ: Идентичная странице логина */}
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

      {/* ПРАВАЯ ЧАСТЬ: Идентичный черный брутальный блок */}
      <div className='bg-black w-full lg:w-1/2 lg:max-w-[550px] lg:mr-[5%] flex flex-col items-start justify-center p-8 sm:p-14 xl:p-20 border border-zinc-800 shadow-2xl'>
        
        {/* ШАГ 1: Форма регистрации */}
        {step === 1 && (
          <div className="w-full">
            <h1 className='text-white text-2xl font-black uppercase tracking-[0.05em]'>
              {loc('Реєстрація', 'Registration', 'Регистрация')}
            </h1>
            <p className='text-zinc-500 uppercase tracking-[0.2em] text-[10px] font-mono mt-1'>
              {loc('Створення акаунта покупця', 'Create Customer Account', 'Создание аккаунта покупателя')}
            </p>

            <form className='flex flex-col mt-8 w-full' onSubmit={handleRequestCode}>
              <label className="font-bold text-zinc-500 text-[10px] uppercase tracking-[0.25em] block">
                {loc("Ім'я (необов'язково)", 'Name (optional)', 'Имя (необязательно)')}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-transparent text-zinc-200 font-mono text-sm outline-none placeholder:text-zinc-700 border-b border-zinc-700 focus:border-white py-2 transition-colors"
                placeholder={loc("Ваше ім'я або нікнейм", "Your name or alias", "Ваше имя или никнейм")}
              />

              <label className="font-bold text-zinc-500 text-[10px] uppercase tracking-[0.25em] block mt-6">
                {loc('Електронна пошта', 'Email Address', 'Электронная почта')} *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-transparent text-zinc-200 font-mono text-sm outline-none placeholder:text-zinc-700 border-b border-zinc-700 focus:border-white py-2 transition-colors"
                placeholder="user@eraserhead.com"
              />

              <label className="font-bold text-zinc-500 text-[10px] uppercase tracking-[0.25em] block mt-6">
                {loc('Пароль (від 6 символів)', 'Password (min 6 chars)', 'Пароль (от 6 символов)')} *
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-transparent text-zinc-200 font-mono text-sm outline-none placeholder:text-zinc-700 border-b border-zinc-700 focus:border-white py-2 transition-colors"
                placeholder="•••••••••••"
              />

              <label className="font-bold text-zinc-500 text-[10px] uppercase tracking-[0.25em] block mt-6">
                {loc('Підтвердження пароля', 'Confirm Password', 'Подтверждение пароля')} *
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-transparent text-zinc-200 font-mono text-sm outline-none placeholder:text-zinc-700 border-b border-zinc-700 focus:border-white py-2 transition-colors"
                placeholder="•••••••••••"
              />

              {error && (
                <span className="text-red-400 text-xs mt-3 block font-mono border border-red-900/60 bg-red-950/30 p-2">
                  {error}
                </span>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black py-4 uppercase font-black tracking-[0.3em] text-xs hover:bg-zinc-200 transition-colors mt-8 flex items-center justify-center cursor-pointer active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? (
                  <img src={loadingGif1} className="w-5 h-5" alt="Loading..." />
                ) : (
                  loc("Зареєструватися", "Create Account", "Зарегистрироваться")
                )}
              </button>

              {/* Разделитель ИЛИ */}
              <div className="relative flex items-center justify-center my-6">
                <div className="border-t border-zinc-800 w-full"></div>
                <span className="bg-black px-3 text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-500">
                  {loc('АБО', 'OR', 'ИЛИ')}
                </span>
              </div>

              {/* Регистрация через Google */}
              <GoogleAuthButton 
                text="signup" 
                onError={(msg) => setError(msg)} 
              />

              <div className="flex justify-between items-center pt-6 mt-2 border-t border-zinc-900">
                <span className="text-zinc-500 text-[10px] font-mono uppercase tracking-widest">
                  {loc("Вже маєте акаунт?", "Already have an account?", "Уже есть аккаунт?")}
                </span>
                <span
                  onClick={() => navigate('/login')}
                  className="text-white hover:text-zinc-300 text-[10px] uppercase tracking-widest font-bold border-b border-white pb-0.5 cursor-pointer transition-colors"
                >
                  {t("auth_signin_btn") || loc("Увійти", "Sign In", "Войти")}
                </span>
              </div>
            </form>
          </div>
        )}

        {/* ШАГ 2: Подтверждение кода безопасности */}
        {step === 2 && (
          <div className="w-full">
            <h1 className='text-white text-2xl font-black uppercase tracking-[0.05em]'>
              {loc('Підтвердження коду', 'Security Verification', 'Подтверждение кода')}
            </h1>
            <p className='text-zinc-500 uppercase tracking-[0.2em] text-[10px] font-mono mt-1'>
              {loc('Введіть 6-значний код безпеки', 'Enter 6-digit security code', 'Введите 6-значный код безопасности')}
            </p>

            <div className="mt-6 w-full flex items-center justify-between p-3 bg-[#111111] border border-zinc-800 text-xs">
              <span className="text-zinc-300 font-mono text-xs truncate max-w-[240px]">
                ✉ {email}
              </span>
              <button
                type="button"
                onClick={() => { setStep(1); setError(''); }}
                className="text-[10px] text-zinc-500 hover:text-white uppercase tracking-wider underline cursor-pointer font-mono"
              >
                {loc('Змінити', 'Change', 'Изменить')}
              </button>
            </div>

            {error && (
              <span className="text-red-400 text-xs mt-3 block font-mono border border-red-900/60 bg-red-950/30 p-2">
                {error}
              </span>
            )}

            <div className="py-6 w-full flex justify-center">
              <VerificationCodeInput
                length={6}
                value={code}
                onChange={setCode}
                onComplete={handleVerifyCode}
                disabled={loading}
                hasError={Boolean(error)}
              />
            </div>

            <button
              type="button"
              disabled={code.length < 6 || loading}
              onClick={() => handleVerifyCode(code)}
              className="w-full bg-white text-black py-4 uppercase font-black tracking-[0.3em] text-xs hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center active:scale-[0.99]"
            >
              {loading ? (
                <img src={loadingGif1} className="w-5 h-5" alt="Loading..." />
              ) : (
                loc("Підтвердити код", "Verify Code", "Подтвердить код")
              )}
            </button>

            <div className="pt-4 text-center text-xs font-mono w-full">
              {canResend ? (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loading}
                  className="text-zinc-400 hover:text-white uppercase tracking-wider text-[10px] underline underline-offset-4 cursor-pointer transition-colors"
                >
                  ↻ {loc("Надіслати код повторно", "Resend code", "Отправить код повторно")}
                </button>
              ) : (
                <span className="text-zinc-600 uppercase tracking-widest text-[10px]">
                  {loc("Повторна відправка:", "Resend available in:", "Повторная отправка:")} 00:{countdown < 10 ? `0${countdown}` : countdown}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ШАГ 3: Успешное завершение */}
        {step === 3 && (
          <div className="w-full text-center space-y-4 py-8">
            <div className="w-14 h-14 border border-emerald-500 mx-auto flex items-center justify-center text-2xl font-black text-emerald-400 bg-emerald-950/30">
              ✓
            </div>
            <h1 className='text-white text-2xl font-black uppercase tracking-[0.05em]'>
              {loc('Реєстрація успішна', 'Registration Successful', 'Регистрация успешна')}
            </h1>
            <p className='text-zinc-500 uppercase tracking-[0.2em] text-[10px] font-mono'>
              {loc('Ласкаво просимо до ERASERHEAD', 'Welcome to ERASERHEAD', 'Добро пожаловать в ERASERHEAD')}
            </p>
            <p className="text-xs text-zinc-500 font-mono pt-2">
              {loc('Перенаправлення...', 'Redirecting...', 'Перенаправление...')}
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
