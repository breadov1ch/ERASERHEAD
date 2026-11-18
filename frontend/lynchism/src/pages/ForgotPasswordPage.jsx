import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from '../i18n';
import { API_URL } from '../config';
import VerificationCodeInput from '../components/VerificationCodeInput';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [step, setStep] = useState(1); // 1 = request code, 2 = enter code & new pwd
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/Client/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });

      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        // Not JSON
      }

      if (!res.ok) {
        let msg = 'Не удалось отправить код восстановления';
        if (res.status === 404) {
          msg = 'Сервер відновлення не знайдено (404). Перевірте підключення до бекенду (localhost:5031).';
        } else if (typeof data === 'string') {
          msg = data;
        } else if (data?.message) {
          msg = data.message;
        } else if (data?.title) {
          msg = data.title;
        } else if (text && text.trim()) {
          msg = text;
        }
        throw new Error(msg);
      }

      setInfo(data?.message || 'Код відновлення надіслано на вашу пошту.');
      setStep(2);
    } catch (err) {
      setError(typeof err === 'string' ? err : err.message || 'Помилка надсилання коду');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/Client/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim(),
          newPassword: newPassword
        })
      });

      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        // Not JSON
      }

      if (!res.ok) {
        let msg = 'Не вдалося скинути пароль';
        if (typeof data === 'string') msg = data;
        else if (data?.message) msg = data.message;
        else if (data?.title) msg = data.title;
        else if (text && text.trim()) msg = text;
        throw new Error(msg);
      }

      setInfo(data?.message || 'Пароль успішно змінено.');
      setStep(3);
    } catch (err) {
      setError(typeof err === 'string' ? err : err.message || 'Помилка скидання пароля');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#131313] text-white font-mono flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#181818] border border-zinc-700 p-8 sm:p-10 shadow-2xl relative">
        <span className="text-[10px] text-zinc-500 uppercase tracking-[0.4em] block mb-2">
          SECURITY // ACCESS_RECOVERY
        </span>
        <h1 className="text-2xl font-black uppercase tracking-wider mb-2">
          {t("recovery_title")}
        </h1>
        <p className="text-xs text-zinc-400 uppercase tracking-wider mb-8 leading-relaxed">
          {step === 1 ? t("recovery_sub") : "Enter confirmation code and choose your new password."}
        </p>

        {error && (
          <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs uppercase mb-6 tracking-wider">
            {typeof error === 'string' ? error : (error?.message || JSON.stringify(error))}
          </div>
        )}

        {info && (
          <div className="p-3 bg-[#111111] border border-zinc-700 text-zinc-200 text-xs uppercase mb-6 tracking-wider">
            {info}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleSendCode} className="space-y-6">
            <div className="flex flex-col gap-2">
              <label className="text-zinc-400 text-[10px] uppercase tracking-widest font-bold">
                {t("auth_email")} *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@address.com"
                className="bg-[#111111] border border-zinc-700 text-white p-2.5 text-xs outline-none focus:border-white transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black py-4 uppercase text-xs font-black tracking-[0.3em] hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? "DISPATCHING..." : t("recovery_send_code")}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div className="flex flex-col gap-2">
              <label className="text-zinc-500 text-[10px] uppercase tracking-widest text-center">
                {t("recovery_code")} *
              </label>
              <VerificationCodeInput
                length={6}
                value={code}
                onChange={setCode}
                disabled={loading}
                hasError={Boolean(error)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-zinc-500 text-[10px] uppercase tracking-widest">
                {t("recovery_new_pwd")} *
              </label>
              <input
                type="password"
                required
                minLength="6"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="bg-transparent border-b border-zinc-800 text-white p-2 text-xs outline-none focus:border-white transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black py-4 uppercase text-xs font-black tracking-[0.3em] hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? "COMMITTING..." : t("recovery_confirm_btn")}
            </button>
          </form>
        )}

        {step === 3 && (
          <div className="space-y-6 text-center">
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-white text-black py-4 uppercase text-xs font-black tracking-[0.3em] hover:bg-zinc-200 transition-colors cursor-pointer"
            >
              {t("nav_login")} →
            </button>
          </div>
        )}

        <div className="mt-8 pt-4 border-t border-zinc-900 text-center">
          <Link
            to="/login"
            className="text-[10px] text-zinc-500 uppercase tracking-widest hover:text-white transition-colors"
          >
            {t("recovery_back_to_login")}
          </Link>
        </div>
      </div>
    </div>
  );
}
