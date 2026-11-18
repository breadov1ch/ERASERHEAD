import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../i18n';
import heroGif from '../assets/hero.gif';

export default function Home() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const categories = [
    {
      title: t("home_cat_headwear_title"),
      subtitle: t("home_cat_headwear_sub"),
      tag: t("home_cat_headwear_tag"),
      categoryParam: "Headwear",
      img: "https://img.pddpic.com/open-gw/2024-03-05/5254050f-2707-4040-9db7-7cc7a57d116d.jpeg?imageMogr2/quality/90/thumbnail/1300x9999%3E"
    },
    {
      title: t("home_cat_outerwear_title"),
      subtitle: t("home_cat_outerwear_sub"),
      tag: t("home_cat_outerwear_tag"),
      categoryParam: "Outerwear",
      img: "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=85"
    },
    {
      title: t("home_cat_pants_title"),
      subtitle: t("home_cat_pants_sub"),
      tag: t("home_cat_pants_tag"),
      categoryParam: "Pants",
      img: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=800&q=85"
    },
    {
      title: t("home_cat_tops_title"),
      subtitle: t("home_cat_tops_sub"),
      tag: t("home_cat_tops_tag"),
      categoryParam: "Tops",
      img: "https://i.postimg.cc/VLXtMqpN/photo-1-2026-03-24-16-48-12.png"
    },
    {
      title: t("home_cat_accessories_title"),
      subtitle: t("home_cat_accessories_sub"),
      tag: t("home_cat_accessories_tag"),
      categoryParam: "Accessories",
      img: "https://images.unsplash.com/photo-1576053139778-7e32f2ae3cfd?auto=format&fit=crop&w=800&q=85"
    }
  ];

  return (
    <div className="bg-[#131313] text-white min-h-screen">
      
      {/* HERO СЕКЦИЯ С АНИМИРОВАННОЙ ГИФКОЙ */}
      <div className="relative w-full h-[65vh] sm:h-[80vh] overflow-hidden border-b border-zinc-700 bg-[#161616]">
        <div className="absolute inset-0 bg-black/50 z-10" />
        <img 
          src={heroGif} 
          alt="Eraserhead Visual Hero"
          className="w-full h-full object-cover object-top filter contrast-110"
        />

        <div className="absolute inset-0 z-20 flex flex-col justify-end p-6 sm:p-14 max-w-6xl mx-auto">
          <span className="text-[10px] sm:text-xs text-zinc-400 uppercase tracking-[0.5em] mb-2 font-mono">
            DNIPRO // DROP 2026 // ARCHIVE
          </span>
          <h1 className="text-4xl sm:text-7xl lg:text-8xl font-black uppercase tracking-tighter leading-none text-white max-w-3xl">
            {t("home_drop_title")}
          </h1>
          <p className="text-zinc-300 text-xs sm:text-sm tracking-[0.2em] uppercase mt-4 max-w-xl leading-relaxed">
            {t("home_drop_sub")}
          </p>

          <div className="flex flex-wrap gap-4 mt-8">
            <button 
              onClick={() => navigate("/catalog")} 
              className="bg-white text-black px-8 py-4 uppercase tracking-[0.25em] text-xs font-black hover:bg-zinc-300 transition-colors cursor-pointer"
            >
              {t("home_explore_btn")}
            </button>
            <button 
              onClick={() => navigate("/about")} 
              className="border border-zinc-700 bg-black/60 text-white px-8 py-4 uppercase tracking-[0.25em] text-xs font-bold hover:bg-zinc-900 transition-colors cursor-pointer"
            >
              {t("home_manifesto_btn")}
            </button>
          </div>
        </div>
      </div>

      {/* КАТЕГОРИИ */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-10 py-16 sm:py-24">
        <div className="flex justify-between items-baseline border-b border-zinc-700 pb-4 mb-10">
          <div>
            <span className="text-[10px] text-zinc-500 uppercase tracking-[0.4em] block font-mono">
              COLLECTIONS
            </span>
            <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white mt-1">
              {t("home_divisions")}
            </h2>
          </div>
          <button 
            onClick={() => navigate("/catalog")}
            className="text-xs uppercase tracking-widest text-zinc-400 hover:text-white underline cursor-pointer"
          >
            {t("home_all_items")}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6">
          {categories.map((cat, idx) => (
            <div 
              key={idx}
              onClick={() => {
                navigate(`/catalog?category=${cat.categoryParam}`);
                window.scrollTo({ top: 0, behavior: 'instant' });
              }}
              className="group border border-zinc-700/80 bg-[#181818] p-4 hover:border-zinc-400 transition-all duration-300 cursor-pointer flex flex-col justify-between shadow-md"
            >
              <div>
                <span className="text-[10px] text-zinc-400 uppercase tracking-widest block mb-2 font-mono">
                  {cat.tag}
                </span>
                <div className="overflow-hidden aspect-[3/4] bg-[#111111] border border-zinc-800/80 mb-4 flex items-center justify-center">
                  <img 
                    src={cat.img} 
                    alt={cat.title}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" 
                  />
                </div>
                <h3 className="text-base font-bold uppercase tracking-wider text-white">
                  {cat.title}
                </h3>
                <p className="text-[11px] text-zinc-400 uppercase tracking-wider mt-1">
                  {cat.subtitle}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-800 text-right">
                <span className="text-[10px] text-zinc-400 uppercase tracking-widest group-hover:text-white transition-colors font-mono">
                  {t("home_cat_view")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ПРЕИМУЩЕСТВА */}
      <div className="border-t border-zinc-700 bg-[#161616] px-6 py-16">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <div className="border-l border-zinc-700 pl-4 space-y-1">
            <span className="text-[10px] text-zinc-400 uppercase tracking-widest block font-mono">
              {t("home_spec_materials_tag")}
            </span>
            <p className="text-sm font-bold uppercase text-white">{t("home_spec_denim")}</p>
            <p className="text-zinc-400 text-xs leading-relaxed">{t("home_spec_denim_sub")}</p>
          </div>
          <div className="border-l border-zinc-700 pl-4 space-y-1">
            <span className="text-[10px] text-zinc-400 uppercase tracking-widest block font-mono">
              {t("home_spec_comfort_tag")}
            </span>
            <p className="text-sm font-bold uppercase text-white">{t("home_spec_terry")}</p>
            <p className="text-zinc-400 text-xs leading-relaxed">{t("home_spec_terry_sub")}</p>
          </div>
          <div className="border-l border-zinc-800 pl-4 space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest block font-mono">
              {t("home_spec_delivery_tag")}
            </span>
            <p className="text-sm font-bold uppercase text-white">{t("home_spec_delivery")}</p>
            <p className="text-zinc-400 text-xs leading-relaxed">{t("home_spec_delivery_sub")}</p>
          </div>
        </div>
      </div>

    </div>
  );
}
