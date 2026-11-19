import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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

  // ШАГ 1: Отправка формы и запрос кода подтверждения
  const handleRequestCode = async (e) => {
    e.preventDefault();
    setError('');

    if (password && password.length < 6) {
      setError(t("auth_password_short") || loc('Пароль повинен містити щонайменше 6 символів', 'Password must be at least 6 characters', 'Пароль должен содержать минимум 6 символов'));
      return;
    }

    if (password && password !== confirmPassword) {
      setError(t("auth_passwords_mismatch") || loc('Введені паролі не співпадають', 'Passwords do not match', 'Введенные пароли не совпадают'));
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: name.trim() || email.split('@')[0],
        email: email.trim(),
        password: password.trim() || null
      };

      const response = await fetch(`${API_URL}/Client/send-register-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

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

  // ШАГ 2: Подтверждение введенного 6-значного кода
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

      // Сохраняем полученные токены авторизации
      if (data?.accessToken) {
        localStorage.setItem("access_token", data.accessToken);
      }
      if (data?.refreshToken) {
        localStorage.setItem("refresh_token", data.refreshToken);
      }

      // Оповещаем Header и все компоненты о входе
      window.dispatchEvent(new Event("authChanged"));

      triggerToast(t("auth_registration_success") || loc("Реєстрація успішна! Ласкаво просимо.", "Registration successful! Welcome.", "Регистрация успешна! Добро пожаловать."));
      setStep(3);

      // Автоматический переход на главную через 2 секунды
      setTimeout(() => {
        navigate("/");
      }, 2200);
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

    try {
      const payload = {
        name: name.trim() || email.split('@')[0],
        email: email.trim(),
        password: password.trim() || null
      };

      const res = await fetch(`${API_URL}/Client/send-register-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || 'Не вдалося повторно надіслати код');
      }

      triggerToast(t("auth_code_sent_toast") || "Новий код надіслано на вашу пошту");
      setCountdown(60);
      setCanResend(false);
      setCode('');
    } catch (err) {
      setError(err.message || 'Помилка надсилання коду');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen flex justify-center bg-[#131313] text-white font-mono'>
      {/* Левая декоративная колонка */}
      <div className='hidden lg:flex w-full items-start justify-center flex-col px-[8%] border-r border-zinc-700 bg-[#131313]'>
        <span className="text-zinc-500 text-xs uppercase tracking-[0.4em] mb-4">
          DNIPRO // SYSTEM_ACCESS // REGISTRATION
        </span>
        <h1 className="font-display text-[7vw] xl:text-[110px] font-black uppercase text-white tracking-[-0.05em] leading-[0.8]">
          ERASERHEAD
        </h1>
        <p className='max-w-[700px] text-xs text-zinc-400 uppercase tracking-[0.2em] leading-relaxed mt-6'>
          Curated industrial streetwear archive. Create an access identity to log orders, build your archive, and receive priority drop dispatches.
        </p>
      </div>

      {/* Правая колонка с интерактивной формой */}
      <div className='flex items-center justify-center w-full lg:max-w-[620px] p-6 sm:p-14 bg-[#181818] border-l border-zinc-700 shadow-2xl'>
        <div className='max-w-[440px] w-full'>

          {/* ШАГ 1: Ввод данных регистрации */}
          {step === 1 && (
            <div className="animate-fade-in">
              <span className="text-[10px] text-zinc-500 uppercase tracking-[0.4em] block mb-2 font-mono">
                ACCESS_INITIALIZATION // STEP_01
              </span>
              <h2 className='text-3xl font-black uppercase tracking-tight mb-2'>
                {t("auth_register_title")}
              </h2>
              <p className="text-xs text-zinc-400 mb-8 leading-relaxed">
                {t("auth_register_subtitle") || "Введіть пошту та пароль. Ми надішлемо одноразовий код підтвердження."}
              </p>

              {error && (
                <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs uppercase mb-6 tracking-wider">
                  {typeof error === 'string' ? error : (error?.message || JSON.stringify(error))}
                </div>
              )}

              <form onSubmit={handleRequestCode} className="space-y-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-zinc-400 text-[10px] uppercase tracking-widest font-bold">
                    {t("auth_name")} (OPTIONAL)
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Architect_01"
                    className="bg-[#111111] border border-zinc-700 text-white px-3.5 py-3 text-xs outline-none focus:border-white transition-colors rounded-none font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-zinc-400 text-[10px] uppercase tracking-widest font-bold">
                    {t("auth_email")} *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@address.com"
                    className="bg-[#111111] border border-zinc-700 text-white px-3.5 py-3 text-xs outline-none focus:border-white transition-colors rounded-none font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-zinc-400 text-[10px] uppercase tracking-widest font-bold">
                    {t("auth_password")} *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="•••••••• (MIN 6 CHARACTERS)"
                    className="bg-[#111111] border border-zinc-700 text-white px-3.5 py-3 text-xs outline-none focus:border-white transition-colors rounded-none font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">
                    {t("auth_register_confirm_pwd")} *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="bg-black border border-zinc-800 text-white px-3.5 py-3 text-xs outline-none focus:border-white transition-colors rounded-none font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-white text-black py-4 uppercase text-xs font-black tracking-[0.3em] hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-50 mt-6"
                >
                  {loading ? (t("auth_sending_code_btn") || loc("НАДСИЛАЄМО КОД...", "SENDING CODE...", "ОТПРАВЛЯЕМ КОД...")) : (t("auth_send_code_btn") || loc("ОТРИМАТИ КОД ПІДТВЕРДЖЕННЯ →", "GET VERIFICATION CODE →", "ПОЛУЧИТЬ КОД ПОДТВЕРЖДЕНИЯ →"))}
                </button>

                {/* Разделитель ИЛИ */}
                <div className="relative flex items-center justify-center my-4">
                  <div className="border-t border-zinc-800 w-full"></div>
                  <span className="bg-[#181818] px-3 text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-500">
                    {loc('АБО', 'OR', 'ИЛИ')}
                  </span>
                </div>

                {/* Быстрая регистрация через Google */}
                <GoogleAuthButton 
                  text="signup"
                  onError={(msg) => setError(msg)}
                />

                <div className="pt-4 border-t border-zinc-900 text-center">
                  <Link
                    to="/login"
                    className="text-[10px] text-zinc-500 uppercase tracking-widest hover:text-white transition-colors"
                  >
                    {t("auth_have_account")} →
                  </Link>
                </div>
              </form>
            </div>
          )}

          {/* ШАГ 2: Красивый ввод 6-значного кода с почты */}
          {step === 2 && (
            <div className="animate-fade-in space-y-6">
              <div>
                <span className="text-[10px] text-zinc-500 uppercase tracking-[0.4em] block mb-2 font-mono">
                  SECURITY_VERIFICATION // STEP_02
                </span>
                <h2 className='text-2xl sm:text-3xl font-black uppercase tracking-tight text-white'>
                  {t("auth_verify_title")}
                </h2>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  {t("auth_verify_subtitle")}
                </p>

                {/* Плашка с адресом и кнопкой смены */}
                <div className="mt-3 flex items-center justify-between p-3 bg-[#111111] border border-zinc-700 rounded-none text-xs">
                  <span className="text-white font-mono font-bold truncate max-w-[240px]">
                    ✉ {email}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setStep(1); setError(''); }}
                    className="text-[10px] text-zinc-400 hover:text-white uppercase tracking-wider underline cursor-pointer font-mono"
                  >
                    {t("auth_change_email")}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs uppercase tracking-wider">
                  {typeof error === 'string' ? error : (error?.message || JSON.stringify(error))}
                </div>
              )}

              {/* КРАСИВЫЙ ИНТЕРАКТИВНЫЙ ВВОД КОДА */}
              <div className="py-2">
                <VerificationCodeInput
                  length={6}
                  value={code}
                  onChange={setCode}
                  onComplete={handleVerifyCode}
                  disabled={loading}
                  hasError={Boolean(error)}
                />
              </div>

              {/* Кнопка подтверждения */}
              <button
                type="button"
                disabled={code.length < 6 || loading}
                onClick={() => handleVerifyCode(code)}
                className="w-full bg-white text-black py-4 uppercase text-xs font-black tracking-[0.3em] hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? t("auth_verifying_btn") : t("auth_verify_btn")}
              </button>

              {/* Повторная отправка с таймером */}
              <div className="pt-2 text-center text-xs font-mono">
                {canResend ? (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={loading}
                    className="text-zinc-300 hover:text-white uppercase tracking-wider text-[11px] underline underline-offset-4 cursor-pointer transition-colors"
                  >
                    ↻ {t("auth_resend_code")}
                  </button>
                ) : (
                  <span className="text-zinc-500 uppercase tracking-widest text-[10px]">
                    {t("auth_resend_wait")} 00:{countdown < 10 ? `0${countdown}` : countdown}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ШАГ 3: Успешная верификация и переадресация */}
          {step === 3 && (
            <div className="animate-fade-in text-center space-y-6 py-8">
              <div className="w-16 h-16 border-2 border-white rounded-none mx-auto flex items-center justify-center text-2xl font-black text-white bg-black shadow-[0_0_25px_rgba(255,255,255,0.2)]">
                ✓
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase tracking-[0.4em] block mb-2 font-mono">
                  IDENTITY_VERIFIED // SYSTEM_ONLINE
                </span>
                <h2 className="text-2xl font-black uppercase text-white tracking-tight">
                  {t("auth_registration_success")}
                </h2>
                <p className="text-xs text-zinc-400 mt-2 font-mono">
                  Redirecting to archive session...
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
