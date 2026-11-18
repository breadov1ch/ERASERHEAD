import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from './i18n';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="w-full bg-[#111111] border-t border-zinc-700 pt-16 pb-12 px-6 sm:px-12 font-mono uppercase text-zinc-300">
      <div className="max-w-[1500px] mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-16 mb-16">

          {/* Колонка 1: Бренд и концепт */}
          <div className="space-y-4">
            <h2 className="text-white text-2xl font-black tracking-tight leading-none">
              ERASERHEAD
            </h2>
            <div className="space-y-1.5 text-[10px] text-zinc-500 tracking-[0.2em] leading-relaxed">
              <p>ARCHIVE // INDUSTRIAL APPAREL LAB</p>
              <p>{t("footer_origin")}</p>
              <p className="text-zinc-600 pt-2 font-mono">STATUS: SYSTEM_ONLINE_2026</p>
            </div>
            <p className="text-[11px] text-zinc-400 normal-case leading-relaxed pt-1">
              {t("footer_desc")}
            </p>
          </div>

          {/* Колонка 2: Навигация */}
          <div className="space-y-3">
            <h3 className="text-zinc-500 text-[10px] tracking-[0.3em] font-bold">
              {t("footer_nav_title")}
            </h3>
            <div className="flex flex-col gap-2.5 text-xs tracking-wider">
              <Link to="/catalog" className="hover:text-white transition-colors">
                {t("nav_catalog")}
              </Link>
              <Link to="/about" className="hover:text-white transition-colors">
                {t("nav_about")}
              </Link>
              <Link to="/cart" className="hover:text-white transition-colors">
                {t("nav_cart")}
              </Link>
              <Link to="/profile" className="hover:text-white transition-colors">
                {t("nav_profile")}
              </Link>
            </div>
          </div>

          {/* Колонка 3: Сервис и доставка */}
          <div className="space-y-3">
            <h3 className="text-zinc-500 text-[10px] tracking-[0.3em] font-bold">
              {t("footer_service_title")}
            </h3>
            <div className="space-y-2 text-xs text-zinc-400 leading-relaxed tracking-wider normal-case">
              <p>
                <strong className="text-white uppercase font-mono block mb-0.5">
                  {t("footer_shipping_label")}
                </strong>
                {t("footer_shipping_desc")}
              </p>
              <p>
                <strong className="text-white uppercase font-mono block mb-0.5">
                  {t("footer_guarantee_label")}
                </strong>
                {t("footer_guarantee_desc")}
              </p>
              <p>
                <strong className="text-white uppercase font-mono block mb-0.5">
                  {t("footer_payment_label")}
                </strong>
                {t("footer_payment_desc")}
              </p>
            </div>
          </div>

          {/* Колонка 4: Контакты и соцсети */}
          <div className="space-y-3">
            <h3 className="text-zinc-500 text-[10px] tracking-[0.3em] font-bold">
              {t("footer_contacts_title")}
            </h3>
            <div className="flex flex-col gap-2.5 text-xs tracking-wider">
              <a
                href="https://t.me/eraserhead_store"
                target="_blank"
                rel="noreferrer"
                className="hover:text-white transition-colors flex items-center gap-2"
              >
                <span>↗</span> {t("footer_tg")}
              </a>
              <a
                href="https://instagram.com/eraserhead.store"
                target="_blank"
                rel="noreferrer"
                className="hover:text-white transition-colors flex items-center gap-2"
              >
                <span>↗</span> Instagram
              </a>
              <a
                href="mailto:eraserhead.store@gmail.com"
                className="hover:text-white transition-colors flex items-center gap-2"
              >
                <span>✉</span> eraserhead.store@gmail.com
              </a>
            </div>
          </div>

        </div>

        {/* Нижняя полоса */}
        <div className="border-t border-zinc-900 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-zinc-600 tracking-widest">
          <div>
            {t("footer_all_rights")}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
              <span className="px-2 py-0.5 bg-black border border-zinc-800 text-[8px] text-zinc-400 font-mono">VISA</span>
              <span className="px-2 py-0.5 bg-black border border-zinc-800 text-[8px] text-zinc-400 font-mono">MASTERCARD</span>
              <span className="px-2 py-0.5 bg-black border border-zinc-800 text-[8px] text-zinc-400 font-mono">APPLE PAY</span>
              <span className="px-2 py-0.5 bg-black border border-zinc-800 text-[8px] text-zinc-400 font-mono">GOOGLE PAY</span>
            </div>
            <span className="font-mono text-zinc-700">V.1.2.0_STABLE</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
