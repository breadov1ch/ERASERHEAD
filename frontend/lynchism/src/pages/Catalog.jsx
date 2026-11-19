import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Slider from '@mui/material/Slider';
import { refreshTokens } from '../api';
import { toggleWishlist, getWishlist } from '../wishlistManager';
import { playClickSound } from '../soundEffects';
import { triggerToast } from '../components/ToastNotification';
import { useTranslation } from '../i18n';
import { useCurrency } from '../currency';
import { API_URL } from '../config';
import { sortSizesDesc } from '../sizeUtils';

export const isProductMatchingCategory = (product, catKey) => {
  if (!catKey || catKey === "All") return true;
  const catLower = catKey.toLowerCase();
  const pCatLower = (product.category || "").toLowerCase();
  const pName = (product.name || "").toLowerCase();

  if (catLower === "hoodies") {
    return pCatLower === "hoodies" || /hoodie|худи|худі|zip|зип|зіп/i.test(pName);
  } else if (catLower === "tshirts") {
    return pCatLower === "tshirts" || (pCatLower === "tops" && !/hoodie|худи|худі|sweater|свитер|светр|knit/i.test(pName)) || /tee|t-shirt|футболк|топ|майк/i.test(pName);
  } else if (catLower === "sweatpants") {
    return pCatLower === "sweatpants" || /sport|track|sweatpant|спортивн|джоггер|jogger/i.test(pName);
  } else if (catLower === "shorts") {
    return pCatLower === "shorts" || /short|шорт/i.test(pName);
  } else if (catLower === "pants") {
    return pCatLower === "pants" || /jean|denim|pant|джинс|брюк|штани|штаны|flare|baggy|cargo/i.test(pName);
  } else if (catLower === "sweaters") {
    return pCatLower === "sweaters" || /sweater|knit|свитшот|світшот|свитер|светр|джемпер|cardigan/i.test(pName);
  } else if (catLower === "winterjackets") {
    return pCatLower === "winterjackets" || /winter|пуховик|пух|coat|зимн|зимов|parka|пальто/i.test(pName);
  } else if (catLower === "midseasonjackets") {
    return pCatLower === "midseasonjackets" || (pCatLower === "outerwear" && !/windbreaker|ветровк|вітровк|anorak/i.test(pName)) || /jacket|куртк|демисезон|демісезон|leather vest|bomber|бомбер/i.test(pName);
  } else if (catLower === "windbreakers") {
    return pCatLower === "windbreakers" || /windbreaker|ветровк|вітровк|анорак|anorak/i.test(pName);
  } else if (catLower === "headwear") {
    return pCatLower === "headwear" || pCatLower === "hats" || /hat|cap|beanie|шапка|ушанка|балаклава|кепка|панама|headwear/i.test(pName);
  } else if (catLower === "accessories") {
    return pCatLower === "accessories" || /belt|bag|chain|ring|choker|mask|gaiter|scarf|glove|ремень|сумк|цепь|кольцо|чокер|маска|перчатк/i.test(pName);
  }
  return pCatLower === catLower;
};

export default function Catalog() {
  const { formatPrice } = useCurrency();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlCategory = searchParams.get("category");
  const urlGender = searchParams.get("gender");

  const [value, setValue] = useState([0, 10000]);
  const [size, setSize] = useState("All");
  const [category, setCategory] = useState(urlCategory || "All");
  const [gender, setGender] = useState(urlGender || "All");
  const [searchQuery, setSearchQuery] = useState("");
  const [minOfMax, setMinOfMax] = useState(0);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [wishlistState, setWishlistState] = useState(getWishlist());
  const [isScrolled, setIsScrolled] = useState(false);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  useEffect(() => {
    const qCategory = searchParams.get("category");
    const qGender = searchParams.get("gender");
    if (qCategory) setCategory(qCategory);
    if (qGender) setGender(qGender);
  }, [searchParams]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 200);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const activeFiltersCount =
    (gender !== "All" && gender !== "" ? 1 : 0) +
    (category !== "All" && category !== "" ? 1 : 0) +
    (size !== "All" && size !== "" ? 1 : 0) +
    (searchQuery.trim() !== "" ? 1 : 0) +
    (value[0] > 0 || value[1] < 10000 ? 1 : 0) +
    (minOfMax !== 0 ? 1 : 0) +
    (showSavedOnly ? 1 : 0);

  const handleResetFilters = () => {
    playClickSound();
    setSearchQuery('');
    setCategory('All');
    setGender('All');
    setSize('All');
    setValue([0, 10000]);
    setMinOfMax(0);
    setShowSavedOnly(false);
    setSearchParams({});
    setFilterPanelOpen(false);
  };

  const scrollToTop = () => {
    playClickSound();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const dispatch = useDispatch();
  const { products, loading } = useSelector(state => state.products);
  const navigate = useNavigate();
  const { t, lang, loc } = useTranslation();

  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat) {
      setCategory(cat);
    } else {
      setCategory("All");
    }
  }, [searchParams]);

  useEffect(() => {
    const getProducts = async () => {
      dispatch({ type: "FETCH_PRODUCTS_LOADING" });
      try {
        let response = await fetch(`${API_URL}/Product/GetProducts`);
        if (!response.ok && response.status === 401) {
          const isRefreshed = await refreshTokens();
          if (isRefreshed) {
            response = await fetch(`${API_URL}/Product/GetProducts`);
          }
        }

        if (!response.ok) {
          throw new Error("FETCH_FAILED");
        }

        const data = await response.json();
        dispatch({ type: "SET_PRODUCTS", payload: data });
      } catch (err) {
        console.error("FETCH_PRODUCTS_FAILED:", err);
      }
    };

    if (products.length === 0) {
      getProducts();
    }

    const handleWishlistUpdate = () => setWishlistState(getWishlist());
    window.addEventListener("wishlistUpdated", handleWishlistUpdate);
    return () => window.removeEventListener("wishlistUpdated", handleWishlistUpdate);
  }, [dispatch, products.length]);

  const handleCategoryChange = (newCat) => {
    playClickSound();
    setCategory(newCat);
    const nextParams = new URLSearchParams(searchParams);
    if (newCat && newCat !== "All") {
      nextParams.set("category", newCat);
    } else {
      nextParams.delete("category");
    }
    setSearchParams(nextParams);
  };

  const handleSizeClick = (e, product, chosenSize) => {
    e.stopPropagation();
    playClickSound();
    navigate(`/product/${product.id}?size=${encodeURIComponent(chosenSize)}`);
  };

  const handleCardWishlist = (e, productId) => {
    e.stopPropagation();
    playClickSound();
    const state = toggleWishlist(productId);
    triggerToast(state ? t("product_wishlist_added_toast") : t("product_wishlist_removed_toast"));
  };

  const handleGenderChange = (newGender) => {
    playClickSound();
    setGender(newGender);
    const newParams = new URLSearchParams(searchParams);
    if (newGender && newGender !== "All") {
      newParams.set("gender", newGender);
    } else {
      newParams.delete("gender");
    }
    setSearchParams(newParams);
  };

  const filteredProducts = products.filter((product) => {
    const isPriceOk = product.price >= value[0] && product.price <= value[1];

    const pGender = (product.gender || "Unisex").toLowerCase();
    const gFilter = (gender || "All").toLowerCase();

    let isGenderOk = true;
    if (gFilter !== "all" && gFilter !== "") {
      if (gFilter === "men") {
        isGenderOk = pGender === "men" || pGender === "unisex" || (product.category && product.category.toLowerCase() === "men");
      } else if (gFilter === "women") {
        isGenderOk = pGender === "women" || pGender === "unisex" || (product.category && product.category.toLowerCase() === "women");
      } else if (gFilter === "unisex") {
        isGenderOk = pGender === "unisex" || (product.category && product.category.toLowerCase() === "unisex");
      } else {
        isGenderOk = pGender === gFilter || (product.category && product.category.toLowerCase() === gFilter);
      }
    }

    const isCategoryOk = isProductMatchingCategory(product, category);
    const isSizeOk = size === "All" || size === "" || product.sizes?.some(s => s.size === size && s.quantity > 0);
    const isSearchOk = searchQuery.trim() === "" ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.category && product.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (product.gender && product.gender.toLowerCase().includes(searchQuery.toLowerCase()));
    const isSavedOk = !showSavedOnly || wishlistState.includes(product.id);

    return isPriceOk && isGenderOk && isCategoryOk && isSizeOk && isSearchOk && isSavedOk;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) =>
    minOfMax === 1 ? a.price - b.price : b.price - a.price
  );

  const genderTabs = [
    { key: "All", label: t("gender_all") || loc("Всі", "All", "Все") },
    { key: "Men", label: t("gender_men") || loc("Чоловіче", "Men", "Мужское") },
    { key: "Women", label: t("gender_women") || loc("Жіноче", "Women", "Женское") },
    { key: "Unisex", label: t("gender_unisex") || loc("Унісекс", "Unisex", "Унисекс") }
  ];

  const categoryTabs = [
    { key: "All", label: t("catalog_all_cats") || loc("Усі категорії", "All Categories", "Все категории") },
    { key: "Hoodies", label: t("cat_hoodies") || loc("Худі та Зіпери", "Hoodies & Zippers", "Худи и Зипперы") },
    { key: "TShirts", label: t("cat_tshirts") || loc("Футболки", "T-Shirts", "Футболки") },
    { key: "Sweatpants", label: t("cat_sweatpants") || loc("Спортивні штани", "Sweatpants", "Спортивные штаны") },
    { key: "Shorts", label: t("cat_shorts") || loc("Шорти", "Shorts", "Шорты") },
    { key: "Pants", label: t("cat_pants") || loc("Штани та джинси", "Pants & Jeans", "Брюки и джинсы") },
    { key: "Sweaters", label: t("cat_sweaters") || loc("Світшоти та светри", "Sweaters & Knits", "Свитшоты и свитера") },
    { key: "WinterJackets", label: t("cat_winter_jackets") || loc("Зимові пуховики та куртки", "Winter Jackets", "Зимние пуховики и куртки") },
    { key: "MidseasonJackets", label: t("cat_midseason_jackets") || loc("Демісезонні куртки", "Midseason Jackets", "Демисезонные куртки") },
    { key: "Windbreakers", label: t("cat_windbreakers") || loc("Вітровки", "Windbreakers", "Ветровки") },
    { key: "Headwear", label: t("cat_headwear") || loc("Головні убори", "Headwear & Caps", "Головные уборы") },
    { key: "Accessories", label: t("cat_accessories") || loc("Аксесуари", "Accessories", "Аксессуары") }
  ];

  const categoryCounts = useMemo(() => {
    const counts = { All: products.length };
    categoryTabs.forEach(tab => {
      if (tab.key !== "All") {
        counts[tab.key] = products.filter(p => isProductMatchingCategory(p, tab.key)).length;
      }
    });
    return counts;
  }, [products]);

  return (
    <div className="bg-[#131313] text-zinc-100 min-h-screen py-8 px-4 sm:px-6 lg:px-8 font-mono">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Заголовок каталога (Компактный на телефоне) */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-zinc-800 pb-3 sm:pb-5 gap-2 sm:gap-3">
          <div>
            <div className="flex items-baseline gap-2.5">
              <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white">
                {t("catalog_title")}
              </h1>
              <span className="text-[11px] sm:text-xs text-zinc-400 uppercase tracking-widest font-mono">
                {"//"} <strong className="text-white">{sortedProducts.length}</strong> {loc('товарів', 'items', 'товаров')}
              </span>
            </div>
          </div>
          <p className="hidden md:block text-xs text-zinc-400 uppercase tracking-wider max-w-sm sm:text-right">
            {t("catalog_quote")}
          </p>
        </div>

        {/* ЛИПКАЯ ПАНЕЛЬ ФИЛЬТРАЦИИ И КАТЕГОРИЙ */}
        <div className="sticky top-[47px] sm:top-[51px] z-30 bg-[#141414]/95 backdrop-blur-md border-b border-zinc-800 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 shadow-2xl transition-all duration-300 space-y-2">
          
          {/* РЯД 1: ВЫБОР ПОЛА + БЫСТРЫЙ ПОИСК И СОРТИРОВКА ДЛЯ ПК */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {/* Выбор пола */}
            <div className="grid grid-cols-4 sm:flex items-center gap-1 bg-[#0e0e0e] p-1 border border-zinc-800">
              {genderTabs.map((gTab) => {
                const isGenderActive = (gender || "All").toLowerCase() === gTab.key.toLowerCase();
                return (
                  <button
                    key={gTab.key}
                    type="button"
                    onClick={() => handleGenderChange(gTab.key)}
                    className={`py-1.5 px-2.5 sm:px-3 text-[10px] sm:text-xs font-bold uppercase tracking-wider font-mono text-center transition-all cursor-pointer btn-press ${
                      isGenderActive
                        ? 'bg-white text-black font-black shadow-sm'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                    }`}
                  >
                    {gTab.label}
                  </button>
                );
              })}
            </div>

            {/* На десктопе по центру/справа: быстрый поиск, сортировка и фильтры */}
            <div className="flex items-center justify-between sm:justify-end gap-2">
              {/* Быстрый поиск для десктопа */}
              <div className="hidden lg:flex items-center relative w-52 xl:w-64">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("catalog_search") || loc("Пошук товару...", "Search items...", "Поиск товара...")}
                  className="w-full bg-[#0e0e0e] border border-zinc-700 text-white text-xs font-mono px-3 py-1.5 pr-7 outline-none focus:border-white transition-colors placeholder:text-zinc-600"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 text-zinc-400 hover:text-white text-xs cursor-pointer font-bold"
                  >
                    ✕
                  </button>
                ) : (
                  <span className="absolute right-2 text-zinc-600 text-xs pointer-events-none">⌕</span>
                )}
              </div>

              {/* Сортировка цены */}
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setMinOfMax(prev => prev === 0 ? 1 : 0);
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#181818] border border-zinc-700 hover:border-zinc-400 text-zinc-200 text-xs font-mono font-bold uppercase cursor-pointer btn-press transition-colors"
                title={loc("Сортування за ціною", "Sort by price", "Сортировка по цене")}
              >
                <span>{minOfMax === 0 ? loc('Ціна ↓', 'Price ↓', 'Цена ↓') : loc('Ціна ↑', 'Price ↑', 'Цена ↑')}</span>
              </button>

              {/* Кнопка расширенных фильтров */}
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setFilterPanelOpen(prev => !prev);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider border cursor-pointer btn-press transition-colors ${
                  filterPanelOpen || (activeFiltersCount > 0 && (size !== 'All' || showSavedOnly || value[0] > 0 || value[1] < 10000))
                    ? 'bg-white text-black border-white font-black'
                    : 'bg-[#181818] text-zinc-200 border-zinc-700 hover:border-zinc-400 hover:text-white'
                }`}
                title={loc("Розширені фільтри (розмір, ціна)", "Advanced filters (size, price)", "Расширенные фильтры (размер, цена)")}
              >
                <span>⚙</span>
                <span>{loc("ФІЛЬТРИ", "FILTERS", "ФИЛЬТРЫ")}</span>
                {activeFiltersCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-black text-white text-[9px] font-bold font-mono border border-zinc-600">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {/* Сброс */}
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex items-center px-2 py-1.5 text-[10px] font-mono text-zinc-400 hover:text-white uppercase tracking-wider cursor-pointer underline"
                  title={loc("Скинути всі фільтри", "Reset all filters", "Сбросить все фильтры")}
                >
                  {loc("✕ Скинути", "✕ Reset", "✕ Сбросить")}
                </button>
              )}
            </div>
          </div>

          {/* РЯД 2: КАТЕГОРИИ: НА ДЕСКТОПЕ ОНИ ОБЕРНУТЫ (flex-wrap) И ВСЁ ВИДНО, НА ТЕЛЕФОНЕ — ПЛАВНЫЙ СКРОЛЛ */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto sm:overflow-visible sm:flex-wrap no-scrollbar py-0.5 flex-1">
              {categoryTabs.map((tab) => {
                const isTabActive = category.toLowerCase() === tab.key.toLowerCase();
                const count = categoryCounts[tab.key] ?? 0;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => handleCategoryChange(tab.key)}
                    className={`shrink-0 px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider font-mono border transition-all cursor-pointer btn-press flex items-center gap-1.5 ${
                      isTabActive
                        ? 'bg-white text-black border-white shadow-md font-black'
                        : 'bg-[#181818] text-zinc-300 border-zinc-800 hover:border-zinc-500 hover:text-white'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-[9px] font-mono px-1 py-0.2 ${isTabActive ? 'bg-black text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* На телефоне справа: компактная кнопка фильтров */}
            <div className="sm:hidden flex items-center shrink-0">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setFilterPanelOpen(prev => !prev);
                }}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider border cursor-pointer btn-press transition-colors ${
                  filterPanelOpen || (activeFiltersCount > 0 && (size !== 'All' || searchQuery || showSavedOnly || value[0] > 0 || value[1] < 10000))
                    ? 'bg-white text-black border-white font-black'
                    : 'bg-[#181818] text-zinc-200 border-zinc-700'
                }`}
              >
                <span>⚙</span>
                {activeFiltersCount > 0 && (
                  <span className="px-1 py-0.2 bg-black text-white text-[9px] font-bold font-mono">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>
          </div>

        </div>

        {/* ЕДИНСТВЕННАЯ ПАНЕЛЬ ДЕТАЛЬНЫХ ФИЛЬТРОВ (БЕЗ ДУБЛЕЙ КАТЕГОРИЙ И ПОЛА) */}
        {filterPanelOpen && (
          <div className="bg-[#161616] border border-zinc-700 p-4 sm:p-5 shadow-2xl animate-fade-in-up space-y-4 font-mono">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-1.5">
                <span>⚙</span> {loc('ДЕТАЛЬНІ ФІЛЬТРИ', 'DETAILED FILTERS', 'ДЕТАЛЬНЫЕ ФИЛЬТРЫ')} // {sortedProducts.length} {loc('ТОВАРІВ', 'ITEMS', 'ТОВАРОВ')}
              </span>
              <div className="flex items-center gap-3">
                {activeFiltersCount > 0 && (
                  <button
                    onClick={handleResetFilters}
                    className="text-[11px] text-zinc-400 hover:text-white uppercase tracking-wider cursor-pointer underline"
                  >
                    {loc('✕ Скинути все', '✕ Reset All', '✕ Сбросить все')}
                  </button>
                )}
                <button
                  onClick={() => setFilterPanelOpen(false)}
                  className="text-zinc-400 hover:text-white text-sm cursor-pointer px-1"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              {/* Поиск */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  {t("catalog_filter_search")}
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("catalog_search")}
                  className="w-full bg-[#101010] border border-zinc-700 text-white px-3 py-2 text-xs outline-none focus:border-white font-mono"
                />
              </div>

              {/* Размеры */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  {t("catalog_filter_size")}
                </label>
                <div className="flex flex-wrap gap-1">
                  {["All", "S", "M", "L", "XL", "XXL", "ONE SIZE"].map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => { playClickSound(); setSize(sz); }}
                      className={`px-2.5 py-1 text-[10px] font-bold uppercase border cursor-pointer transition-all ${size === sz 
                        ? 'bg-white text-black border-white font-black' 
                        : 'bg-black text-zinc-400 border-zinc-800 hover:border-zinc-500 hover:text-white'
                        }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              {/* Диапазон цены (чистый белый слайдер) */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase text-zinc-400">
                  <span>{loc('Ціна:', 'Price:', 'Цена:')}</span>
                  <span className="text-white font-mono">{formatPrice(value[0])} - {formatPrice(value[1])}</span>
                </div>
                <div className="px-2">
                  <Slider
                    value={value}
                    onChange={(e, newVal) => setValue(newVal)}
                    min={0}
                    max={10000}
                    step={50}
                    sx={{
                      color: '#ffffff',
                      height: 2,
                      '& .MuiSlider-thumb': {
                        width: 12,
                        height: 12,
                        borderRadius: '0px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #000000',
                      },
                      '& .MuiSlider-track': {
                        backgroundColor: '#ffffff',
                        border: 'none',
                        height: 2,
                        borderRadius: '0px',
                      },
                      '& .MuiSlider-rail': {
                        backgroundColor: '#3f3f46',
                        opacity: 1,
                        height: 2,
                        borderRadius: '0px',
                      }
                    }}
                  />
                </div>
              </div>

              {/* Сортировка + Избранное + Закрыть */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setShowSavedOnly(!showSavedOnly);
                  }}
                  className={`flex-1 py-2 px-2.5 text-[11px] uppercase font-bold text-center border cursor-pointer transition-colors ${showSavedOnly
                    ? 'bg-white text-black border-white'
                    : 'bg-black text-zinc-300 border-zinc-700 hover:border-zinc-500 hover:text-white'
                    }`}
                  title={loc("Показати тільки обране", "Show wishlist only", "Показать только избранное")}
                >
                  ★ {t("catalog_wishlist_btn")} ({wishlistState.length})
                </button>

                <button
                  type="button"
                  onClick={() => setFilterPanelOpen(false)}
                  className="bg-white text-black font-black uppercase text-xs py-2 px-4 hover:bg-zinc-200 cursor-pointer"
                >
                  {loc("Готово", "Done", "Готово")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ПЛАВАЮЩАЯ КНОПКА ДЛЯ ТЕЛЕФОНА (MOBILE FLOATING TRIGGER) */}
        <div className="md:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-[#141414]/95 backdrop-blur-md border border-zinc-700 px-4 py-2.5 shadow-2xl">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setFilterPanelOpen(true);
            }}
            className="flex items-center gap-2 text-xs font-mono font-black uppercase tracking-wider text-white cursor-pointer btn-press"
          >
            <span>⚙</span>
            <span>{loc("ФІЛЬТРИ", "FILTERS", "ФИЛЬТРЫ")}</span>
            {activeFiltersCount > 0 && (
              <span className="px-1.5 py-0.5 bg-white text-black text-[10px] font-bold">
                {activeFiltersCount}
              </span>
            )}
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-400">{sortedProducts.length} {loc('шт.', 'pcs', 'шт.')}</span>
          </button>

          <button
            type="button"
            onClick={scrollToTop}
            className="pl-3 border-l border-zinc-800 text-zinc-400 hover:text-white text-sm font-bold font-mono cursor-pointer btn-press"
            title={loc("Нагору", "To top", "Наверх")}
          >
            ↑
          </button>
        </div>

        {/* МОБИЛЬНЫЙ BOTTOM SHEET ДЛЯ ТЕЛЕФОНА (ЧИСТЫЙ МОНОХРОМ БЕЗ ЖЕЛТОГО) */}
        {filterPanelOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end animate-fade-in" onClick={() => setFilterPanelOpen(false)}>
            <div
              className="w-full bg-[#161616] border-t border-zinc-700 max-h-[85vh] overflow-y-auto p-5 space-y-5 font-mono animate-slide-up-sheet shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Полоска свайпа сверху */}
              <div className="w-12 h-1 bg-zinc-700 mx-auto rounded-full mb-1"></div>

              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                  <span>⚙</span> {loc("ФІЛЬТРИ", "FILTERS", "ФИЛЬТРЫ")} // {sortedProducts.length} {loc("ЗНАЙДЕНО", "FOUND", "НАЙДЕНО")}
                </span>
                <button
                  onClick={() => setFilterPanelOpen(false)}
                  className="w-7 h-7 bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Поиск */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-zinc-400 block tracking-wider">
                  {loc("Пошук за назвою", "Search by name", "Поиск по названию")}
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={loc("Введіть назву...", "Enter name...", "Введите название...")}
                  className="w-full bg-black border border-zinc-700 text-white p-3 text-xs outline-none focus:border-white font-mono"
                />
              </div>

              {/* Размеры */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-zinc-400 block tracking-wider">
                  {loc("Розмір", "Size", "Размер")}
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {["All", "ONE SIZE", "S", "M", "L", "XL", "XXL"].map((sz) => (
                    <button
                      key={sz}
                      onClick={() => { playClickSound(); setSize(sz); }}
                      className={`py-2 text-xs font-bold uppercase border text-center btn-press ${size === sz ? 'bg-white text-black border-white' : 'bg-black text-zinc-400 border-zinc-800'
                        }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              {/* Диапазон цены */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase text-zinc-400">
                  <span>{loc('Ціна:', 'Price:', 'Цена:')}</span>
                  <span className="text-white font-mono">{formatPrice(value[0])} - {formatPrice(value[1])}</span>
                </div>
                <div className="px-2">
                  <Slider
                    value={value}
                    onChange={(e, newVal) => setValue(newVal)}
                    min={0}
                    max={10000}
                    step={50}
                    sx={{
                      color: '#ffffff',
                      height: 2,
                      '& .MuiSlider-thumb': {
                        width: 14,
                        height: 14,
                        borderRadius: '0px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #000000',
                      },
                      '& .MuiSlider-track': {
                        backgroundColor: '#ffffff',
                        border: 'none',
                        height: 2,
                        borderRadius: '0px',
                      },
                      '& .MuiSlider-rail': {
                        backgroundColor: '#3f3f46',
                        opacity: 1,
                        height: 2,
                        borderRadius: '0px',
                      }
                    }}
                  />
                </div>
              </div>

              {/* Сортировка цены */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-zinc-400 block tracking-wider">
                  {loc("Сортування", "Sorting", "Сортировка")}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { playClickSound(); setMinOfMax(0); }}
                    className={`p-2.5 text-xs font-bold uppercase border text-center btn-press ${minOfMax === 0 ? 'bg-white text-black border-white' : 'bg-black text-zinc-400 border-zinc-800'
                      }`}
                  >
                    {loc("Спочатку дорожчі ↓", "Price: High to Low ↓", "Сначала дороже ↓")}
                  </button>
                  <button
                    onClick={() => { playClickSound(); setMinOfMax(1); }}
                    className={`p-2.5 text-xs font-bold uppercase border text-center btn-press ${minOfMax === 1 ? 'bg-white text-black border-white' : 'bg-black text-zinc-400 border-zinc-800'
                      }`}
                  >
                    {loc("Спочатку дешевші ↑", "Price: Low to High ↑", "Сначала дешевле ↑")}
                  </button>
                </div>
              </div>

              {/* Избранное */}
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setShowSavedOnly(!showSavedOnly);
                }}
                className={`w-full p-2.5 text-xs uppercase font-bold text-center border cursor-pointer transition-colors ${showSavedOnly
                  ? 'bg-white text-black border-white'
                  : 'bg-black text-zinc-300 border-zinc-800'
                  }`}
              >
                ★ {loc("ТІЛЬКИ ОБРАНЕ", "WISHLIST ONLY", "ТОЛЬКО ИЗБРАННОЕ")} ({wishlistState.length})
              </button>

              {/* Кнопки применить и сбросить */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => setFilterPanelOpen(false)}
                  className="w-full py-3.5 bg-white text-black text-xs font-black uppercase tracking-widest hover:bg-zinc-200 cursor-pointer btn-press"
                >
                  {loc(`ПОКАЗАТИ ${sortedProducts.length} ТОВАРІВ`, `SHOW ${sortedProducts.length} ITEMS`, `ПОКАЗАТЬ ${sortedProducts.length} ТОВАРОВ`)}
                </button>
                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="w-full py-2.5 border border-zinc-800 text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    {loc("Скинути всі фільтри", "Reset all filters", "Сбросить все фильтры")}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Сетка товаров */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-6 items-stretch">
          {loading ? (
            Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="bg-[#181818] border border-zinc-800 rounded-none p-3 sm:p-4 animate-pulse">
                <div className="aspect-[3/4] bg-zinc-800 rounded-none w-full mb-3"></div>
                <div className="h-3.5 bg-zinc-800 rounded-none w-3/4 mb-2"></div>
                <div className="h-3 bg-zinc-800 rounded-none w-1/2"></div>
              </div>
            ))
          ) : sortedProducts.length === 0 ? (
            <div className="col-span-full py-16 sm:py-24 px-4 text-center space-y-4 border border-zinc-800 bg-[#161616] shadow-2xl font-mono">
              <div className="inline-block p-3 border border-zinc-700 bg-black text-zinc-300 text-xs">
                {category !== 'All' ? (
                  <span>
                    {loc('У КАТЕГОРІЇ', 'IN CATEGORY', 'В КАТЕГОРИИ')} <strong className="text-white">"{categoryTabs.find(c => c.key === category)?.label || category}"</strong> {loc('НАРАЗІ НЕМАЄ ТОВАРІВ', 'NO PRODUCTS FOUND', 'ПОКА НЕТ ТОВАРОВ')}
                  </span>
                ) : (
                  <span>{t("catalog_not_found")}</span>
                )}
              </div>
              <p className="text-xs text-zinc-400 uppercase tracking-widest max-w-md mx-auto leading-relaxed">
                {category !== 'All'
                  ? loc(
                      'Ця категорія оновлюється або очікує надходження нового дропу. Перегляньте весь асортимент в один клік:',
                      'This category is updating or awaiting a new drop. View all available items in one click:',
                      'Эта категория обновляется или ожидает поступления нового дропа. Посмотрите весь ассортимент в один клик:'
                    )
                  : loc(
                      'Спробуйте змінити критерії пошуку або скинути фільтри.',
                      'Try modifying search terms or resetting filters.',
                      'Попробуйте изменить критерии поиска или сбросить фильтры.'
                    )}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleCategoryChange('All')}
                  className="bg-white text-black px-6 py-3 text-xs font-black uppercase tracking-widest hover:bg-zinc-200 transition-all cursor-pointer shadow-lg active:scale-95 btn-press"
                >
                  {loc(`ДИВИТИСЬ УСІ ТОВАРИ (${products.length})`, `VIEW ALL ITEMS (${products.length})`, `СМОТРЕТЬ ВСЕ ТОВАРЫ (${products.length})`)}
                </button>
                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="border border-zinc-700 hover:border-zinc-400 text-zinc-300 hover:text-white px-5 py-3 text-xs font-bold uppercase tracking-widest transition-all cursor-pointer btn-press"
                  >
                    {t("catalog_reset_filters")}
                  </button>
                )}
              </div>
            </div>
          ) : (
            sortedProducts.map(product => {
              const safeImg = (url) => (!url || url.includes('ibb.co')) ? 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1000&q=85' : url;
              const primaryImg = safeImg(product.imageURL || (product.images && product.images[0]));
              const secondaryImg = (product.images && product.images.length > 1) ? safeImg(product.images[1]) : null;
              const saved = wishlistState.includes(product.id);

              return (
                <div
                  key={product.id}
                  onClick={() => navigate(`/product/${product.id}`)}
                  className="group bg-[#181818] border border-zinc-800 rounded-none p-2 sm:p-4 hover:border-zinc-500 cursor-pointer flex flex-col justify-between relative shadow-md product-card-interactive animate-fade-in-up"
                >
                  {/* Кнопка избранного в углу товара */}
                  <div className="absolute top-2.5 right-2.5 sm:top-3.5 sm:right-3.5 z-20">
                    <button
                      type="button"
                      onClick={(e) => handleCardWishlist(e, product.id)}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-none bg-[#121212]/90 border border-zinc-700 flex items-center justify-center text-xs transition-colors hover:border-zinc-400 cursor-pointer btn-press shadow-sm"
                      aria-label="Wishlist"
                    >
                      {saved ? <span className="text-white font-bold">★</span> : <span className="text-zinc-500 hover:text-white">☆</span>}
                    </button>
                  </div>

                  {/* Фото товара */}
                  <div className="overflow-hidden aspect-[3/4] flex items-center justify-center bg-[#111111] border border-zinc-800 rounded-none relative">
                    <img
                      className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                      src={primaryImg}
                      alt={product.name}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1000&q=85';
                      }}
                      loading="lazy"
                    />
                    {secondaryImg && (
                      <img
                        className="w-full h-full object-contain absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                        src={secondaryImg}
                        alt={`${product.name} view 2`}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1000&q=85';
                        }}
                        loading="lazy"
                      />
                    )}
                    {/* Появление доступных размеров ТОЛЬКО при наведении на товар */}
                    <div className="absolute inset-x-0 bottom-0 z-30 bg-[#121212]/95 backdrop-blur-md p-2 border-t border-zinc-800 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 pointer-events-none group-hover:pointer-events-auto">
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider font-mono">
                          {t("catalog_sizes") || "Розміри:"}
                        </span>
                        <span className="text-[9px] text-zinc-300 font-mono">
                          {loc('В товар →', 'View item →', 'В товар →')}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {sortSizesDesc(
                          (product.sizes && product.sizes.length > 0)
                            ? product.sizes
                            : [{ size: "ONE SIZE", quantity: 1 }]
                        ).map((sizeObj) => {
                          const sz = sizeObj.size;
                          const inStock = product.isPreOrder || (sizeObj.quantity || 0) > 0;
                          if (!inStock) return null;

                          return (
                            <button
                              key={sz}
                              type="button"
                              onClick={(e) => handleSizeClick(e, product, sz)}
                              className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider font-mono bg-black hover:bg-white hover:text-black text-zinc-200 border border-zinc-700 hover:border-white transition-all cursor-pointer btn-press"
                              title={`${t("product_size")} ${sz}`}
                            >
                              {sz}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Название и цена */}
                  <div className="mt-2.5 sm:mt-3 space-y-0.5 sm:space-y-1">
                    <h2 className="font-bold text-xs sm:text-base text-white tracking-tight line-clamp-1 group-hover:text-zinc-200">
                      {product.name}
                    </h2>
                    <div className="flex justify-between items-center gap-1">
                      <span className="text-xs sm:text-base font-bold text-zinc-100 font-mono">
                        {formatPrice(product.price)}
                      </span>
                      <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-zinc-400 font-medium truncate">
                        <span className="text-zinc-300 font-bold uppercase">
                          {product.gender === 'Men' ? (t("gender_men") || loc('Чоловіче', 'Men', 'Мужское')) : product.gender === 'Women' ? (t("gender_women") || loc('Жіноче', 'Women', 'Женское')) : (t("gender_unisex") || loc('Унісекс', 'Unisex', 'Унисекс'))}
                        </span>
                        <span className="text-zinc-600">•</span>
                        <span>{categoryTabs.find(c => c.key.toLowerCase() === (product.category || '').toLowerCase())?.label || product.category}</span>
                      </div>
                    </div>
                  </div>

                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
