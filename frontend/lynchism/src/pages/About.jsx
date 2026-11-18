import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../i18n';

export default function About() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[#131313] text-white font-mono px-6 py-12 md:py-20 flex flex-col items-center">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="border-b border-zinc-700 pb-8 mb-12">
          <span className="text-zinc-500 text-[10px] uppercase tracking-[0.4em] block mb-2">
            DNIPRO // MANIFESTO // 2026
          </span>
          <h1 className="text-4xl md:text-7xl font-black uppercase tracking-tighter leading-none text-white">
            ERASERHEAD
          </h1>
          <p className="text-zinc-400 text-xs md:text-sm tracking-[0.2em] uppercase mt-4 max-w-xl">
            {t("about_hero_sub")}
          </p>
        </div>

        {/* Quotes & Statement */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-16">
          <div className="border-l border-zinc-600 pl-6 space-y-4">
            <p className="text-zinc-400 text-[11px] tracking-widest uppercase font-bold">
              {t("about_philosophy_title")}
            </p>
            <p className="text-sm md:text-base leading-relaxed text-zinc-300 font-sans">
              {t("about_philosophy_text")}
            </p>
          </div>
          <div className="border-l border-zinc-600 pl-6 space-y-4">
            <p className="text-zinc-400 text-[11px] tracking-widest uppercase font-bold">
              {t("about_influence_title")}
            </p>
            <blockquote className="text-sm md:text-base italic text-zinc-300">
              {t("about_influence_quote")}
            </blockquote>
            <span className="text-[10px] text-zinc-400 tracking-widest uppercase block">
              {t("about_influence_author")}
            </span>
          </div>
        </div>

        {/* Pillars / Specifications */}
        <div className="border border-zinc-700 bg-[#181818] p-6 md:p-10 mb-16 shadow-xl">
          <h2 className="text-xs uppercase tracking-[0.4em] text-zinc-400 border-b border-zinc-700 pb-3 mb-6 font-bold">
            {t("about_specs_title")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
            <div>
              <span className="text-zinc-400 block text-[10px] tracking-widest">
                {t("about_spec_cut_title")}
              </span>
              <p className="font-bold text-white uppercase mt-1">
                {t("about_spec_cut_name")}
              </p>
              <p className="text-zinc-300 text-[11px] mt-1">
                {t("about_spec_cut_desc")}
              </p>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px] tracking-widest">
                {t("about_spec_mat_title")}
              </span>
              <p className="font-bold text-white uppercase mt-1">
                {t("about_spec_mat_name")}
              </p>
              <p className="text-zinc-300 text-[11px] mt-1">
                {t("about_spec_mat_desc")}
              </p>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px] tracking-widest">
                {t("about_spec_hard_title")}
              </span>
              <p className="font-bold text-white uppercase mt-1">
                {t("about_spec_hard_name")}
              </p>
              <p className="text-zinc-300 text-[11px] mt-1">
                {t("about_spec_hard_desc")}
              </p>
            </div>
          </div>
        </div>

        {/* Action button */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-t border-zinc-700 pt-8">
          <span className="text-zinc-500 text-[10px] tracking-widest uppercase">
            {t("about_location")}
          </span>
          <Link
            to="/catalog"
            className="w-full sm:w-auto text-center bg-white text-black px-8 py-3 uppercase font-black text-xs tracking-[0.3em] hover:bg-zinc-300 transition-colors"
          >
            {t("about_btn")}
          </Link>
        </div>
      </div>
    </div>
  );
}
