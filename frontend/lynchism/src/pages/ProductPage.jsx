import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { refreshTokens } from '../api';
import { addToGuestCart } from '../cartManager';
import { isInWishlist, toggleWishlist } from '../wishlistManager';
import { playClickSound, playAddSound } from '../soundEffects';
import { triggerToast } from '../components/ToastNotification';
import { useTranslation } from '../i18n';
import { useCurrency } from '../currency';
import { API_URL } from '../config';
import { sortSizesDesc } from '../sizeUtils';

const PLACEHOLDER_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800" fill="%23111111"><rect width="600" height="800" fill="%23111111"/><line x1="0" y1="0" x2="600" y2="800" stroke="%23222222" stroke-width="1"/><line x1="600" y1="0" x2="0" y2="800" stroke="%23222222" stroke-width="1"/><rect x="150" y="375" width="300" height="50" fill="%23161616" stroke="%23333333"/><text x="300" y="406" font-family="monospace" font-size="13" fill="%23888888" font-weight="bold" text-anchor="middle" letter-spacing="4">ERASERHEAD ARCHIVE</text></svg>`;

export default function ProductPage({ updateCart }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const querySize = searchParams.get("size");
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [product, setProduct] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [sizeError, setSizeError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const { t, lang, loc } = useTranslation();

  const handleShare = async () => {
    playClickSound();
    const shareUrl = window.location.href;
    const shareTitle = product?.name || "ERASERHEAD";
    const shareText = `${product?.name || "ERASERHEAD"} — ${formatPrice(product?.price || 0)} // ERASERHEAD ARCHIVE`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl
        });
        triggerToast(loc("Поділилися товаром ✓", "Product link shared ✓", "Поделились товаром ✓"));
        return;
      } catch (err) {
        // Fallback to share modal if cancelled or error
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      triggerToast(loc("Посилання скопійовано в буфер обміну ✓", "Link copied to clipboard ✓", "Ссылка скопирована в буфер обмена ✓"));
      setTimeout(() => setCopiedLink(false), 3000);
    } catch (e) {
      console.warn(e);
    }

    setShowShareModal(true);
  };

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    fetch(`${API_URL}/Product/${id}`)
      .then(res => {
        if (!res.ok) throw new Error("Product not found");
        return res.json();
      })
      .then(data => {
        if (!data || !data.id) {
          setNotFound(true);
          return;
        }
        setProduct(data);
        setActiveImageIndex(0);
        setIsSaved(isInWishlist(id));

        // Если перешли с конкретным размером — выбираем его
        if (querySize) {
          setSelectedSize(querySize);
        } else if (data?.sizes && data.sizes.length === 1) {
          setSelectedSize(data.sizes[0].size);
        } else if (data?.sizes) {
          const inStock = data.sizes.filter(s => (s.quantity || 0) > 0);
          if (inStock.length === 1) {
            setSelectedSize(inStock[0].size);
          }
        }

        // Автоматически выбираем первую расцветку, если у товара есть цвета
        if (data?.colorsJson) {
          try {
            const parsedColors = JSON.parse(data.colorsJson);
            if (Array.isArray(parsedColors) && parsedColors.length > 0) {
              const firstColor = typeof parsedColors[0] === 'string' ? parsedColors[0] : parsedColors[0].name;
              setSelectedColor(firstColor);
            }
          } catch (e) {
            console.error(e);
          }
        }
      })
      .catch(err => {
        console.error("Error receiving product:", err);
        setNotFound(true);
      })
      .finally(() => {
        setLoading(false);
      });

    const handleWishlist = () => setIsSaved(isInWishlist(id));
    window.addEventListener("wishlistUpdated", handleWishlist);
    return () => window.removeEventListener("wishlistUpdated", handleWishlist);
  }, [id, querySize]);

  const safeImg = (url) => (!url || url.includes('ibb.co')) ? PLACEHOLDER_SVG : url;
  const rawImages = product?.images && product.images.length > 0
    ? product.images
    : (product?.imageURL ? [product.imageURL] : []);
  const imagesList = rawImages.map(safeImg);

  const availableColors = (() => {
    if (!product?.colorsJson) return [];
    try {
      const parsed = JSON.parse(product.colorsJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  // ИНТЕРАКТИВНЫЙ СЛАЙДЕР С ЖИВЫМ СВАЙПОМ (ТАЧ И МЫШЬ)
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartXRef = useRef(0);
  const dragStartYRef = useRef(0);
  const isHorizontalSwipeRef = useRef(false);
  const hasMovedRef = useRef(false);

  const handlePrevImage = (e) => {
    e?.stopPropagation();
    playClickSound();
    setActiveImageIndex(prev => prev === 0 ? imagesList.length - 1 : prev - 1);
  };

  const handleNextImage = (e) => {
    e?.stopPropagation();
    playClickSound();
    setActiveImageIndex(prev => prev === imagesList.length - 1 ? 0 : prev + 1);
  };

  const onTouchStartGallery = (e) => {
    if (!e.touches || e.touches.length === 0) return;
    dragStartXRef.current = e.touches[0].clientX;
    dragStartYRef.current = e.touches[0].clientY;
    isHorizontalSwipeRef.current = false;
    hasMovedRef.current = false;
    setIsDragging(true);
  };

  const onTouchMoveGallery = (e) => {
    if (!e.touches || e.touches.length === 0) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - dragStartXRef.current;
    const diffY = currentY - dragStartYRef.current;

    // Определяем горизонтальный свайп, чтобы не мешать вертикальному скроллу
    if (!isHorizontalSwipeRef.current && (Math.abs(diffX) > 7 || Math.abs(diffY) > 7)) {
      if (Math.abs(diffX) > Math.abs(diffY)) {
        isHorizontalSwipeRef.current = true;
      }
    }

    if (isHorizontalSwipeRef.current) {
      hasMovedRef.current = true;
      // Мягкое натяжение на краях списка
      let offset = diffX;
      if ((activeImageIndex === 0 && diffX > 0) || (activeImageIndex === imagesList.length - 1 && diffX < 0)) {
        offset = diffX * 0.35;
      }
      setDragOffset(offset);
    }
  };

  const onTouchEndGallery = () => {
    setIsDragging(false);
    const threshold = 45; // порог срабатывания свайпа (пиксели)

    if (hasMovedRef.current && Math.abs(dragOffset) > threshold) {
      if (dragOffset < -threshold) {
        // Свайп влево -> следующее фото
        playClickSound();
        setActiveImageIndex(prev => (prev < imagesList.length - 1 ? prev + 1 : 0));
      } else if (dragOffset > threshold) {
        // Свайп вправо -> предыдущее фото
        playClickSound();
        setActiveImageIndex(prev => (prev > 0 ? prev - 1 : imagesList.length - 1));
      }
    }
    setDragOffset(0);
    // Держим флаг 250мс, чтобы синтетический click после свайпа на телефоне не открывал зум
    setTimeout(() => {
      hasMovedRef.current = false;
    }, 250);
  };

  const onMouseDownGallery = (e) => {
    if (e.button !== 0) return;
    dragStartXRef.current = e.clientX;
    dragStartYRef.current = e.clientY;
    isHorizontalSwipeRef.current = true;
    hasMovedRef.current = false;
    setIsDragging(true);
  };

  const onMouseMoveGallery = (e) => {
    if (!isDragging) return;
    const diffX = e.clientX - dragStartXRef.current;
    if (Math.abs(diffX) > 6) {
      hasMovedRef.current = true;
    }
    let offset = diffX;
    if ((activeImageIndex === 0 && diffX > 0) || (activeImageIndex === imagesList.length - 1 && diffX < 0)) {
      offset = diffX * 0.35;
    }
    setDragOffset(offset);
  };

  const onMouseUpGallery = () => {
    if (!isDragging) return;
    onTouchEndGallery();
  };

  // Блокировка скролла страницы при открытом зуме (чтобы фото не улетало вниз)
  useEffect(() => {
    if (lightboxOpen) {
      const origOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = origOverflow;
      };
    }
  }, [lightboxOpen]);

  // СВАЙП И ЗАКРЫТИЕ В ЛАЙТБОКСЕ (ПОЛНОЭКРАННЫЙ ЗУМ)
  const lightboxTouchStartX = useRef(0);
  const lightboxTouchStartY = useRef(0);
  const [lightboxDragX, setLightboxDragX] = useState(0);
  const [lightboxDragY, setLightboxDragY] = useState(0);
  const [isLightboxDragging, setIsLightboxDragging] = useState(false);

  const onLightboxTouchStart = (e) => {
    if (!e.touches || e.touches.length === 0) return;
    lightboxTouchStartX.current = e.touches[0].clientX;
    lightboxTouchStartY.current = e.touches[0].clientY;
    setIsLightboxDragging(true);
  };

  const onLightboxTouchMove = (e) => {
    if (!e.touches || e.touches.length === 0) return;
    const dx = e.touches[0].clientX - lightboxTouchStartX.current;
    const dy = e.touches[0].clientY - lightboxTouchStartY.current;

    if (Math.abs(dx) > Math.abs(dy)) {
      setLightboxDragX(dx);
      setLightboxDragY(0);
    } else {
      if (dy > 0) {
        setLightboxDragY(dy * 0.7);
      }
      setLightboxDragX(0);
    }
  };

  const onLightboxTouchEnd = () => {
    setIsLightboxDragging(false);
    if (lightboxDragY > 70) {
      setLightboxOpen(false);
      setLightboxDragY(0);
      setLightboxDragX(0);
      return;
    }
    if (Math.abs(lightboxDragX) > 40) {
      if (lightboxDragX < 0) {
        handleNextImage();
      } else {
        handlePrevImage();
      }
    }
    setLightboxDragX(0);
    setLightboxDragY(0);
  };

  // Переключение фото стрелками клавиатуры и закрытие по Esc
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') handlePrevImage();
      if (e.key === 'ArrowRight') handleNextImage();
      if (e.key === 'Escape' && lightboxOpen) setLightboxOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, imagesList.length]);

  const handleToggleWishlist = () => {
    playClickSound();
    const state = toggleWishlist(id);
    setIsSaved(state);
    triggerToast(state ? t("product_wishlist_added_toast") : t("product_wishlist_removed_toast"));
  };

  const handleSelectSize = (sizeNumber) => {
    playClickSound();
    setSelectedSize(sizeNumber);
    setSizeError(false);
  };

  const addToCart = async (e) => {
    e.preventDefault();
    if (!selectedSize) {
      setSizeError(true);
      triggerToast(t("product_select_size_warn"));
      return;
    }
    setSizeError(false);
    setAdding(true);
    playAddSound();

    const token = localStorage.getItem("access_token");
    const variantText = selectedColor ? `${selectedSize} / ${selectedColor}` : selectedSize;

    const fallbackGuestAdd = () => {
      const res = addToGuestCart(product, selectedSize, 1, selectedColor);
      if (!res.success && res.maxReached) {
        triggerToast(`${t("cart_stock_limit_reached")} (${res.maxStock} шт.)`);
        setAdding(false);
        return;
      }
      if (updateCart) updateCart();
      window.dispatchEvent(new Event("cartUpdated"));
      triggerToast(`${product?.name} [${variantText}] ${t("product_added_toast")}`, {
        linkText: t("product_to_cart"),
        linkUrl: "/cart"
      });
      setAdding(false);
    };

    if (!token) {
      fallbackGuestAdd();
      return;
    }

    try {
      let response = await fetch(`${API_URL}/Cart/add-to-cart`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          productId: parseInt(id, 10),
          quantity: 1,
          size: selectedSize,
          color: selectedColor || ""
        })
      });

      if (response.status === 401) {
        const isRefreshed = await refreshTokens();
        if (isRefreshed) {
          const freshToken = localStorage.getItem("access_token");
          response = await fetch(`${API_URL}/Cart/add-to-cart`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${freshToken}`
            },
            body: JSON.stringify({
              productId: parseInt(id, 10),
              quantity: 1,
              size: selectedSize,
              color: selectedColor || ""
            })
          });
        } else {
          fallbackGuestAdd();
          return;
        }
      }

      if (!response.ok) {
        fallbackGuestAdd();
        return;
      }

      if (updateCart) updateCart();
      window.dispatchEvent(new Event("cartUpdated"));
      triggerToast(`${product?.name} [${variantText}] ${t("product_added_toast")}`, {
        linkText: t("product_to_cart"),
        linkUrl: "/cart"
      });
    } catch (err) {
      fallbackGuestAdd();
    } finally {
      setAdding(false);
    }
  };

  // КРАСИВЫЙ БРУТАЛЬНЫЙ ЛОАДЕР ERASERHEAD ПРИ ВХОДЕ В ТОВАР
  if (loading) {
    return (
      <div className="bg-[#111111] min-h-[85vh] flex flex-col items-center justify-center font-mono text-white px-4 relative overflow-hidden select-none animate-fade-in">
        {/* Деликатная сетка чертежей */}
        <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:28px_28px] opacity-25 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col items-center text-center space-y-6 max-w-md w-full">
          {/* Верхний статус системы */}
          <div className="flex items-center gap-2 text-[10px] text-zinc-500 tracking-[0.28em] uppercase">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
            <span>SYSTEM // APPAREL LAB</span>
          </div>

          {/* Бренд с эффектом сияния */}
          <div className="space-y-1.5">
            <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-[0.25em] sm:tracking-[0.32em] text-white font-mono animate-glitch-pulse">
              ERASERHEAD
            </h1>
            <p className="text-[10px] sm:text-[11px] text-zinc-400 tracking-[0.3em] uppercase">
              ARCHIVE // SPEC #{id}
            </p>
          </div>

          {/* Индустриальный прогресс-бар */}
          <div className="w-56 sm:w-72 h-1 bg-zinc-900 border border-zinc-800 relative overflow-hidden shadow-inner">
            <div className="absolute inset-y-0 bg-white animate-eraserhead-scan"></div>
          </div>

          {/* Нижний терминал */}
          <div className="flex items-center justify-between w-56 sm:w-72 text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
            <span>DISPATCH // DNIPRO</span>
            <span className="animate-pulse text-zinc-300">LOADING...</span>
          </div>
        </div>
      </div>
    );
  }

  // ЕСЛИ ТОВАР НЕ НАЙДЕН
  if (notFound || !product) {
    return (
      <div className="bg-[#111111] min-h-[75vh] flex flex-col items-center justify-center font-mono text-white px-4 space-y-4 text-center animate-fade-in">
        <span className="text-4xl sm:text-5xl font-black tracking-widest text-zinc-700">{"// 404"}</span>
        <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wider text-white">
          {loc("ТОВАР НЕ ЗНАЙДЕНО", "PRODUCT NOT FOUND", "ТОВАР НЕ НАЙДЕН")}
        </h2>
        <p className="text-xs text-zinc-400 max-w-sm tracking-wider uppercase">
          {loc("Можливо, товар було знято з виробництва або архів оновлюється.", "This product may have been archived or removed.", "Возможно, товар был снят с производства или архив обновляется.")}
        </p>
        <button
          onClick={() => navigate('/catalog')}
          className="mt-4 px-6 py-2.5 bg-white text-black text-xs font-black uppercase tracking-widest hover:bg-zinc-200 transition-all cursor-pointer btn-press"
        >
          ← {loc("ДО КАТАЛОГУ", "BACK TO CATALOG", "В КАТАЛОГ")}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#131313] text-zinc-100 min-h-screen py-6 sm:py-10 px-4 sm:px-6 md:px-10 lg:px-14 xl:px-20 font-mono overflow-x-hidden max-w-full">
      {/* Центрированный аккуратный контейнер с отступами по бокам, не на весь экран */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[460px_1fr] xl:grid-cols-[500px_1fr] gap-8 lg:gap-12 items-start w-full min-w-0">

        {/* ЛЕВАЯ КОЛОНКА: ГАЛЕРЕЯ (НОРМАЛЬНЫЙ СТАНДАРТНЫЙ РАЗМЕР 3:4 С АККУРАТНЫМИ ОТСТУПАМИ) */}
        <div className="space-y-3 sm:space-y-4 w-full max-w-[500px] mx-auto min-w-0">

          {/* Главное фото товара: современный плавный слайдер со свайпом */}
          <div
            onTouchStart={onTouchStartGallery}
            onTouchMove={onTouchMoveGallery}
            onTouchEnd={onTouchEndGallery}
            onMouseDown={onMouseDownGallery}
            onMouseMove={onMouseMoveGallery}
            onMouseUp={onMouseUpGallery}
            onMouseLeave={onMouseUpGallery}
            style={{ touchAction: 'pan-y' }}
            className={`w-full aspect-[3/4] max-h-[580px] bg-[#111111] border border-zinc-700 rounded-none relative overflow-hidden group shadow-xl select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
          >
            {/* Горизонтальная анимированная лента слайдов */}
            <div
              className="flex h-full w-full will-change-transform"
              style={{
                transform: `translateX(calc(-${activeImageIndex * 100}% + ${dragOffset}px))`,
                transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              {imagesList.map((img, idx) => (
                <div
                  key={idx}
                  onClick={(e) => {
                    if (hasMovedRef.current) {
                      e.stopPropagation();
                      return;
                    }
                    setLightboxDragX(0);
                    setLightboxDragY(0);
                    setIsLightboxDragging(false);
                    setLightboxOpen(true);
                  }}
                  className="w-full h-full shrink-0 flex items-center justify-center p-2 sm:p-3 relative cursor-zoom-in select-none"
                >
                  <img
                    src={img}
                    alt={`${product?.name} ${idx + 1}`}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = PLACEHOLDER_SVG;
                    }}
                    className="w-full h-full object-contain pointer-events-none select-none transition-transform duration-300 group-hover:scale-105"
                    draggable="false"
                  />
                </div>
              ))}
            </div>

            {/* Стрелки переключения фото */}
            {imagesList.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevImage}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-none bg-black/80 border border-zinc-700 text-white flex items-center justify-center text-base hover:border-white transition-colors z-10 cursor-pointer btn-press"
                  aria-label="Previous image"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={handleNextImage}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-none bg-black/80 border border-zinc-700 text-white flex items-center justify-center text-base hover:border-white transition-colors z-10 cursor-pointer btn-press"
                  aria-label="Next image"
                >
                  ›
                </button>
              </>
            )}

            {/* Индикатор текущего фото */}
            <div className="absolute bottom-2.5 left-2.5 right-2.5 sm:right-auto bg-[#111111]/90 px-2.5 py-1 rounded-none text-[10px] sm:text-[11px] text-zinc-300 border border-zinc-700 uppercase tracking-wider truncate pointer-events-none z-10">
              {t("product_photo")} {activeImageIndex + 1} / {imagesList.length || 1} • {t("product_zoom_tip")}
            </div>

            {/* Современные сегментные полоски-индикаторы сверху */}
            {imagesList.length > 1 && (
              <div className="absolute top-2.5 left-0 right-0 flex justify-center gap-1.5 px-4 pointer-events-none z-10">
                {imagesList.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-0.5 sm:h-1 rounded-none transition-all duration-300 ${idx === activeImageIndex
                      ? 'w-6 sm:w-8 bg-white shadow-sm'
                      : 'w-2 bg-zinc-600/70'
                      }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Миниатюры фото */}
          {imagesList.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar max-w-full">
              {imagesList.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-14 h-18 sm:w-16 sm:h-20 shrink-0 bg-[#111111] rounded-none overflow-hidden p-0 border transition-all cursor-pointer ${idx === activeImageIndex
                    ? 'border-white shadow-md'
                    : 'border-zinc-700 opacity-60 hover:opacity-100 hover:border-zinc-400'
                    }`}
                >
                  <img
                    src={img}
                    alt={`Thumb ${idx}`}
                    className="w-full h-full object-contain"
                  />
                </button>
              ))}
            </div>
          )}

        </div>

        {/* ПРАВАЯ КОЛОНКА: ИНФО О ТОВАРЕ */}
        <div className="bg-[#181818] border border-zinc-700 rounded-none p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 shadow-xl w-full min-w-0 overflow-hidden">

          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-zinc-800">
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-none bg-white text-black uppercase tracking-widest font-mono shrink-0">
                {product?.gender === 'Men' ? (t("gender_men") || loc('ЧОЛОВІЧЕ', 'MEN', 'МУЖСКОЕ')) : product?.gender === 'Women' ? (t("gender_women") || loc('ЖІНОЧЕ', 'WOMEN', 'ЖЕНСКОЕ')) : (t("gender_unisex") || loc('УНІСЕКС', 'UNISEX', 'УНИСЕКС'))}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-none bg-[#121212] text-zinc-300 uppercase tracking-widest border border-zinc-700 font-mono shrink-0">
                {product?.category || t("product_category_default")}
              </span>
              {product?.isPreOrder && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-none bg-black text-zinc-300 uppercase tracking-widest border border-zinc-700 font-mono shrink-0">
                  ★ {loc('ПЕРЕДЗАМОВЛЕННЯ', 'PRE-ORDER', 'ПРЕДЗАКАЗ')}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0 ml-auto">
              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-1 text-[11px] sm:text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer btn-press"
                title={loc("Поділитися товаром", "Share product", "Поделиться товаром")}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3"></circle>
                  <circle cx="6" cy="12" r="3"></circle>
                  <circle cx="18" cy="19" r="3"></circle>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                </svg>
                <span className="uppercase">{loc('ПОДІЛИТИСЯ', 'SHARE', 'ПОДЕЛИТЬСЯ')}</span>
              </button>

              <button
                onClick={handleToggleWishlist}
                className="flex items-center gap-1 text-[11px] sm:text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer btn-press"
              >
                <span>{isSaved ? "★" : "☆"}</span>
                <span className="uppercase">
                  {isSaved ? t("product_wishlist_saved") : t("product_wishlist_add")}
                </span>
              </button>
            </div>
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-tight break-words">
              {product?.name}
            </h1>
            <div className="mt-2.5 sm:mt-3 flex items-baseline gap-3 flex-wrap">
              <span className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white shrink-0 whitespace-nowrap">
                {product ? formatPrice(product.price) : ""}
              </span>
              <span className="text-xs text-zinc-400">
                {t("product_taxes_included")}
              </span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed whitespace-pre-line break-words">
            {product?.description}
          </p>

          {/* Параметры ткани и кроя */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 p-3.5 sm:p-4 bg-[#111111] rounded-none border border-zinc-700 text-xs">
            <div className="min-w-0">
              <span className="text-zinc-400 block mb-0.5 uppercase tracking-wider text-[10px]">
                {t("product_silhouette")}:
              </span>
              <span className="text-white font-bold uppercase break-words block">
                {product?.silhouette || "OVERSIZED"}
              </span>
            </div>
            <div className="min-w-0">
              <span className="text-zinc-400 block mb-0.5 uppercase tracking-wider text-[10px]">
                {t("product_fabric")}:
              </span>
              <span className="text-white font-bold uppercase break-words block">
                {product?.fabric || t("product_fabric_default")}
              </span>
            </div>
          </div>

          {/* Выбор расцветки */}
          {availableColors.length > 0 && (
            <div className="space-y-2.5 pt-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <span>{t("product_color")}</span>
                  <span className="text-zinc-300 font-mono font-bold">{selectedColor}</span>
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                {availableColors.map((c, idx) => {
                  const colorName = typeof c === 'string' ? c : c.name;
                  const colorHex = typeof c === 'object' && c.hex ? c.hex : null;
                  const isColorSel = selectedColor === colorName;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setSelectedColor(colorName);
                        if (typeof c === 'object' && c.imageUrl) {
                          const imgIdx = imagesList.indexOf(c.imageUrl);
                          if (imgIdx > -1) setActiveImageIndex(imgIdx);
                        }
                      }}
                      className={`px-3.5 py-2 rounded-none text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-2 border cursor-pointer transition-all ${isColorSel
                        ? 'border-white bg-white text-black font-black shadow-lg'
                        : 'border-zinc-700 bg-[#121212] text-zinc-300 hover:border-zinc-400'
                        }`}
                    >
                      {colorHex && (
                        <span
                          className="w-3 h-3 rounded-full border border-zinc-600 shrink-0"
                          style={{ backgroundColor: colorHex }}
                        />
                      )}
                      <span>{colorName}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Выбор размера */}
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <span>{t("product_select_size")}</span>
                {sizeError && (
                  <span className="text-red-400 text-xs font-normal normal-case">
                    {t("product_select_size_error")}
                  </span>
                )}
              </label>
              <button
                type="button"
                onClick={() => setShowSizeGuide(true)}
                className="text-[11px] text-zinc-400 hover:text-white underline cursor-pointer uppercase tracking-wider"
              >
                {t("product_size_guide")}
              </button>
            </div>

            {/* Сетка размеров */}
            {(() => {
              const rawSizes = (product?.sizes && product.sizes.length > 0)
                ? product.sizes
                : [{ size: "ONE SIZE", quantity: 10 }];
              const sizesList = sortSizesDesc(rawSizes);

              // Если всего один размер (например ONE SIZE для шапки/аксессуара)
              if (sizesList.length === 1) {
                const single = sizesList[0];
                const isAvail = product?.isPreOrder || (single.quantity || 0) > 0;
                const isSel = selectedSize === single.size;

                return (
                  <div className="space-y-2">
                    <button
                      type="button"
                      disabled={!isAvail}
                      onClick={() => handleSelectSize(single.size)}
                      className={`w-full py-3 sm:py-3.5 px-3 sm:px-4 rounded-none font-bold text-xs uppercase tracking-widest font-mono flex flex-wrap items-center justify-between gap-2 border cursor-pointer transition-all ${!isAvail
                        ? 'border-red-900/50 bg-red-950/20 text-red-400 line-through cursor-not-allowed'
                        : isSel
                          ? 'border-white bg-white text-black font-black shadow-lg'
                          : 'border-zinc-700 bg-[#121212] text-white hover:border-white'
                        }`}
                    >
                      <span className="flex items-center gap-2 shrink-0">
                        <span className="text-zinc-400">{t("product_size")}</span>
                        <span className="text-sm font-black underline underline-offset-4">{single.size}</span>
                      </span>
                      <span className={`text-[10px] sm:text-[11px] font-mono shrink-0 ${isSel ? 'text-zinc-800 font-bold' : (product?.isPreOrder ? 'text-zinc-300' : 'text-emerald-400')}`}>
                        {product?.isPreOrder ? loc('Передзамовлення (10-14 днів)', 'Pre-order (10-14 days)', 'Предзаказ (10-14 дней)') : (isAvail ? t("product_in_stock") : t("product_out_of_stock"))}
                      </span>
                    </button>
                  </div>
                );
              }

              // Если несколько размеров
              return (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {sizesList.map((sizeObj) => {
                    const sz = sizeObj.size;
                    const isAvailable = product?.isPreOrder || (sizeObj.quantity || 0) > 0;
                    const isSelected = selectedSize === sz;

                    return (
                      <button
                        key={sz}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => handleSelectSize(sz)}
                        className={`py-3 rounded-none text-xs font-bold transition-all relative flex flex-col items-center justify-center border font-mono cursor-pointer ${!isAvailable
                          ? 'opacity-25 bg-[#121212] border-zinc-800 text-zinc-600 line-through cursor-not-allowed'
                          : isSelected
                            ? 'border-white bg-white text-black shadow-lg font-black'
                            : 'border-zinc-700 bg-[#121212] text-zinc-200 hover:border-zinc-400'
                          }`}
                      >
                        <span className="text-xs uppercase">{sz}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })()}

            {/* Подтверждение выбранного размера */}
            {selectedSize && (
              <p className="text-xs text-zinc-400 pt-1 uppercase tracking-wider font-mono">
                {t("product_size")} <strong className="text-white">{selectedSize}</strong> • <span className={`font-bold ${product?.isPreOrder ? 'text-zinc-300' : 'text-emerald-400'}`}>{product?.isPreOrder ? loc('Передзамовлення (10-14 днів)', 'Pre-order (10-14 days)', 'Предзаказ (10-14 дней)') : t("product_in_stock")}</span>
              </p>
            )}
          </div>

          {/* Кнопка добавления в корзину */}
          <button
            type="button"
            disabled={adding}
            onClick={addToCart}
            className="w-full py-4 rounded-none font-black uppercase tracking-widest text-xs transition-all cursor-pointer disabled:opacity-50 mt-4 bg-white hover:bg-zinc-200 text-black btn-press"
          >
            {adding ? t("product_adding") : t("product_add_to_cart")}
          </button>

          {/* Плашка информации о предзаказе */}
          {product?.isPreOrder && (
            <div className="p-3.5 sm:p-4 bg-[#141414] border border-zinc-700 text-zinc-200 text-xs font-mono space-y-2 shadow-md">
              <div className="font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 uppercase tracking-wider text-white">
                <span className="flex items-center gap-1.5">
                  <span className="text-zinc-400">★</span>
                  <span>{loc('ПОЗИЦІЯ ЗА ПЕРЕДЗАМОВЛЕННЯМ', 'PRE-ORDER ITEM', 'ПОЗИЦИЯ ПО ПРЕДЗАКАЗУ')}</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 border border-zinc-700 bg-black text-zinc-300 w-fit shrink-0">
                  {loc('10–14 РОБОЧИХ ДНІВ', '10–14 BUSINESS DAYS', '10–14 РАБОЧИХ ДНЕЙ')}
                </span>
              </div>
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                {loc(
                  'Поставка під замовлення (бронювання позиції). Термін відправки: 10–14 робочих днів. Для оформлення діє 100% повна оплата або передплата 50% (залишок сплачується при отриманні на пошті).',
                  'On-demand supply (item reservation). Dispatch timeframe: 10–14 business days. Requires 100% full payment or a 50% deposit (remaining balance is settled upon delivery).',
                  'Поставка под заказ (бронирование позиции). Срок отправки: 10–14 рабочих дней. Действует 100% полная оплата или предоплата 50% (остаток оплачивается при получении на почте).'
                )}
              </p>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider pt-1 border-t border-zinc-800">
                {loc(
                  '✓ Можливість повернення та обміну протягом 14 днів після отримання',
                  '✓ 14-day return and exchange policy after delivery',
                  '✓ Возможность возврата и обмена в течение 14 дней после получения'
                )}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* ПОЛНОЭКРАННЫЙ ПРОСМОТР ФОТО (LIGHTBOX) С ЖИВЫМ СВАЙПОМ И ЗАКРЫТИЕМ ВНИЗ */}
      {lightboxOpen && createPortal(
        <div
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-3 select-none"
          style={{ touchAction: 'none' }}
        >
          {/* Фиксированная кнопка закрытия */}
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="fixed top-4 right-4 z-50 bg-black/90 border border-zinc-700 text-white px-3.5 py-2 text-xs font-mono uppercase tracking-widest hover:border-white transition-colors cursor-pointer shadow-xl flex items-center gap-1.5 btn-press"
          >
            <span>✕</span>
            <span>{t("product_close")}</span>
          </button>

          {/* Индикатор текущего кадра */}
          <div className="fixed top-4 left-4 z-50 pointer-events-none">
            <span className="bg-black/90 px-3 py-1.5 border border-zinc-800 text-[11px] text-zinc-300 font-mono uppercase tracking-wider">
              {activeImageIndex + 1} / {imagesList.length || 1}
            </span>
          </div>

          {/* Контейнер изображения: строго центрирован, не улетает вниз */}
          <div
            className="relative flex items-center justify-center max-w-4xl max-h-[82vh] w-full"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={onLightboxTouchStart}
            onTouchMove={onLightboxTouchMove}
            onTouchEnd={onLightboxTouchEnd}
            style={{
              transform: `translate(${lightboxDragX}px, ${lightboxDragY}px)`,
              transition: isLightboxDragging ? 'none' : 'transform 0.25s ease-out',
              opacity: lightboxDragY > 0 ? Math.max(0.2, 1 - lightboxDragY / 250) : 1,
              touchAction: 'none'
            }}
          >
            <img
              key={`lightbox-${activeImageIndex}`}
              src={imagesList[activeImageIndex] || safeImg(product?.imageURL)}
              alt="High-Res Inspection"
              className="max-w-[92vw] max-h-[80vh] object-contain rounded-none border border-zinc-800 shadow-2xl pointer-events-none select-none animate-fade-in"
              draggable="false"
            />
          </div>

          {/* Стрелки переключения для ПК */}
          {imagesList.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrevImage}
                className="hidden sm:flex fixed left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/90 border border-zinc-700 text-white items-center justify-center text-lg hover:border-white transition-colors cursor-pointer z-50 btn-press"
                aria-label="Previous image"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={handleNextImage}
                className="hidden sm:flex fixed right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/90 border border-zinc-700 text-white items-center justify-center text-lg hover:border-white transition-colors cursor-pointer z-50 btn-press"
                aria-label="Next image"
              >
                ›
              </button>
            </>
          )}

          {/* Подсказка для мобильных телефонов */}
          <div className="fixed bottom-4 left-0 right-0 flex justify-center pointer-events-none z-50 sm:hidden">
            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest bg-black/80 px-2.5 py-1 border border-zinc-800">
              ← Свайп для зміни • Вниз для закриття ↓
            </span>
          </div>
        </div>,
        document.body
      )}

      {/* ТАБЛИЦА РАЗМЕРОВ (SIZE GUIDE) */}
      {showSizeGuide && (() => {
        let customChart = null;
        if (product?.sizeChartJson) {
          try {
            customChart = typeof product.sizeChartJson === 'string'
              ? JSON.parse(product.sizeChartJson)
              : product.sizeChartJson;
          } catch (e) {
            console.error("Error parsing sizeChartJson", e);
          }
        }

        const categoryKey = product?.category?.toLowerCase() || 'tops';
        const isPants = categoryKey === 'pants' || categoryKey.includes('брюк') || categoryKey.includes('джинс');
        const isOuter = categoryKey === 'outerwear' || categoryKey.includes('курт') || categoryKey.includes('пальт');

        // Локализованные заголовки колонок
        const getHeaders = () => {
          if (lang === 'ua') {
            if (isPants) return ["Розмір", "Талія", "Стегна", "Довжина", "Ширина низу"];
            if (isOuter) return ["Розмір", "Обхват грудей", "Довжина куртки", "Плечі", "Рукав"];
            return ["Розмір", "Обхват грудей", "Довжина", "Плечі", "Зріст"];
          }
          if (lang === 'ru') {
            if (isPants) return ["Размер", "Талия", "Бедра", "Длина", "Ширина низа"];
            if (isOuter) return ["Размер", "Обхват груди", "Длина куртки", "Плечи", "Рукав"];
            return ["Размер", "Обхват груди", "Длина", "Плечи", "Рост"];
          }
          if (isPants) return ["Size", "Waist", "Hips", "Length", "Leg Opening"];
          if (isOuter) return ["Size", "Chest", "Jacket Length", "Shoulders", "Sleeve"];
          return ["Size", "Chest", "Length", "Shoulders", "Height"];
        };

        const headers = getHeaders();

        return createPortal(
          <div
            onClick={() => setShowSizeGuide(false)}
            className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[999] p-4 animate-fade-in font-mono"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-black border border-zinc-800 rounded-none p-6 sm:p-8 max-w-xl w-full text-zinc-300 shadow-2xl space-y-5"
            >
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest block font-mono">
                    SIZE_GUIDE // {customChart?.title || product?.category || "SPECS"}
                  </span>
                  <h3 className="text-base font-black uppercase tracking-wider text-white mt-1">
                    {t("product_size_chart_title")}
                  </h3>
                </div>
                <button
                  onClick={() => setShowSizeGuide(false)}
                  className="text-zinc-500 hover:text-white text-xs uppercase tracking-wider px-3 py-1.5 rounded-none border border-zinc-800 hover:border-zinc-500 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span>✕</span>
                  <span>{t("product_close")}</span>
                </button>
              </div>

              {/* Если для товара задана кастомная таблица */}
              {customChart && customChart.columns && customChart.rows ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-zinc-800 rounded-none">
                    <thead>
                      <tr className="bg-zinc-900 text-zinc-300 border-b border-zinc-800 text-[11px] uppercase tracking-wider">
                        <th className="p-3">{headers[0]}</th>
                        {customChart.columns.map((col, idx) => (
                          <th key={idx} className="p-3">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900 text-xs">
                      {Object.entries(customChart.rows).map(([sz, vals]) => (
                        <tr key={sz} className="hover:bg-zinc-950/60">
                          <td className="p-3 font-bold text-white uppercase">{sz}</td>
                          {customChart.columns.map((col, cIdx) => (
                            <td key={cIdx} className="p-3 text-zinc-300">
                              {vals && vals[col] ? (vals[col].toString().includes('см') ? vals[col] : `${vals[col]} см`) : '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : isPants ? (
                /* Дефолтная таблица для БРЮК */
                <table className="w-full text-left text-xs border border-zinc-800 rounded-none overflow-hidden">
                  <thead>
                    <tr className="bg-zinc-900 text-zinc-300 border-b border-zinc-800 text-[11px] uppercase tracking-wider">
                      {headers.map((h, idx) => (
                        <th key={idx} className="p-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 text-xs">
                    <tr><td className="p-3 font-bold text-white">S (30)</td><td className="p-3">76-80 см</td><td className="p-3">102 см</td><td className="p-3">106 см</td><td className="p-3 text-zinc-400">24 см</td></tr>
                    <tr><td className="p-3 font-bold text-white">M (32)</td><td className="p-3">81-85 см</td><td className="p-3">106 см</td><td className="p-3">108 см</td><td className="p-3 text-zinc-400">25 см</td></tr>
                    <tr><td className="p-3 font-bold text-white">L (34)</td><td className="p-3">86-90 см</td><td className="p-3">110 см</td><td className="p-3">110 см</td><td className="p-3 text-zinc-400">26 см</td></tr>
                    <tr><td className="p-3 font-bold text-white">XL (36)</td><td className="p-3">91-96 см</td><td className="p-3">116 см</td><td className="p-3">112 см</td><td className="p-3 text-zinc-400">27 см</td></tr>
                    <tr><td className="p-3 font-bold text-white">XXL (38)</td><td className="p-3">97-102 см</td><td className="p-3">122 см</td><td className="p-3">114 см</td><td className="p-3 text-zinc-400">28 см</td></tr>
                  </tbody>
                </table>
              ) : isOuter ? (
                /* Дефолтная таблица для ВЕРХНЕЙ ОДЕЖДЫ */
                <table className="w-full text-left text-xs border border-zinc-800 rounded-none overflow-hidden">
                  <thead>
                    <tr className="bg-zinc-900 text-zinc-300 border-b border-zinc-800 text-[11px] uppercase tracking-wider">
                      {headers.map((h, idx) => (
                        <th key={idx} className="p-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 text-xs">
                    <tr><td className="p-3 font-bold text-white">S</td><td className="p-3">120 см</td><td className="p-3">68 см</td><td className="p-3">56 см</td><td className="p-3">64 см</td></tr>
                    <tr><td className="p-3 font-bold text-white">M</td><td className="p-3">126 см</td><td className="p-3">70 см</td><td className="p-3">58 см</td><td className="p-3">66 см</td></tr>
                    <tr><td className="p-3 font-bold text-white">L</td><td className="p-3">132 см</td><td className="p-3">72 см</td><td className="p-3">60 см</td><td className="p-3">68 см</td></tr>
                    <tr><td className="p-3 font-bold text-white">XL</td><td className="p-3">138 см</td><td className="p-3">74 см</td><td className="p-3">62 см</td><td className="p-3">70 см</td></tr>
                    <tr><td className="p-3 font-bold text-white">XXL</td><td className="p-3">144 см</td><td className="p-3">76 см</td><td className="p-3">64 см</td><td className="p-3">72 см</td></tr>
                  </tbody>
                </table>
              ) : (
                /* Дефолтная таблица для ФУТБОЛОК / ХУДИ */
                <table className="w-full text-left text-xs border border-zinc-800 rounded-none overflow-hidden">
                  <thead>
                    <tr className="bg-zinc-900 text-zinc-300 border-b border-zinc-800 text-[11px] uppercase tracking-wider">
                      {headers.map((h, idx) => (
                        <th key={idx} className="p-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 text-xs">
                    <tr><td className="p-3 font-bold text-white">S</td><td className="p-3">112 см</td><td className="p-3">71 см</td><td className="p-3">54 см</td><td className="p-3 text-zinc-500">165-175 см</td></tr>
                    <tr><td className="p-3 font-bold text-white">M</td><td className="p-3">118 см</td><td className="p-3">73 см</td><td className="p-3">56 см</td><td className="p-3 text-zinc-500">175-182 см</td></tr>
                    <tr><td className="p-3 font-bold text-white">L</td><td className="p-3">124 см</td><td className="p-3">75 см</td><td className="p-3">58 см</td><td className="p-3 text-zinc-500">180-188 см</td></tr>
                    <tr><td className="p-3 font-bold text-white">XL</td><td className="p-3">130 см</td><td className="p-3">77 см</td><td className="p-3">60 см</td><td className="p-3 text-zinc-500">185-195 см</td></tr>
                    <tr><td className="p-3 font-bold text-white">XXL</td><td className="p-3">136 см</td><td className="p-3">79 см</td><td className="p-3">62 см</td><td className="p-3 text-zinc-500">190+ см</td></tr>
                  </tbody>
                </table>
              )}

              <p className="text-[11px] text-zinc-500 leading-relaxed uppercase tracking-wider pt-2 border-t border-zinc-900">
                {t("product_size_chart_note")}
              </p>
            </div>
          </div>,
          document.body
        );
      })()}

      {/* МОДАЛКА "ПОДЕЛИТЬСЯ ТОВАРОМ" */}
      {showShareModal && createPortal(
        <div
          onClick={() => setShowShareModal(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in font-mono"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#161616] border border-zinc-700 w-full max-w-md p-6 space-y-5 shadow-2xl relative animate-scale-in text-zinc-100"
          >
            {/* Закрыть */}
            <button
              onClick={() => setShowShareModal(false)}
              className="absolute top-4 right-4 w-7 h-7 bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center text-sm cursor-pointer"
            >
              ✕
            </button>

            {/* Заголовок */}
            <div>
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest block mb-1">
                {"// SHARE ARCHIVE ITEM"}
              </span>
              <h3 className="text-base font-extrabold uppercase tracking-tight text-white">
                {loc('Поділитися товаром', 'Share product', 'Поделиться товаром')}
              </h3>
            </div>

            {/* Превью товара */}
            {product && (
              <div className="flex items-center gap-3 p-3 bg-[#111111] border border-zinc-800">
                <img
                  src={imagesList[0] || product.imageURL}
                  alt={product.name}
                  className="w-14 h-16 object-contain bg-black border border-zinc-800"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white uppercase truncate">{product.name}</p>
                  <p className="text-xs text-zinc-300 font-mono mt-0.5">{formatPrice(product.price)}</p>
                  {product.isPreOrder && (
                    <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block mt-0.5">
                      ★ {loc('Передзамовлення', 'Pre-order', 'Предзаказ')}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Скопировать ссылку */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                {loc('Пряме посилання на товар', 'Direct product link', 'Прямая ссылка на товар')}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={window.location.href}
                  className="flex-1 bg-black border border-zinc-700 text-zinc-300 px-3 py-2 text-xs font-mono select-all outline-none"
                />
                <button
                  type="button"
                  onClick={async () => {
                    playClickSound();
                    try {
                      await navigator.clipboard.writeText(window.location.href);
                      setCopiedLink(true);
                      triggerToast(loc("Скопійовано ✓", "Copied ✓", "Скопировано ✓"));
                      setTimeout(() => setCopiedLink(false), 2500);
                    } catch (e) {
                      console.warn(e);
                    }
                  }}
                  className={`px-3.5 py-2 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border font-mono btn-press ${copiedLink
                    ? 'bg-emerald-500 text-black border-emerald-400 font-black'
                    : 'bg-white text-black border-white hover:bg-zinc-200'
                    }`}
                >
                  {copiedLink ? "✓" : loc("Копія", "Copy", "Копия")}
                </button>
              </div>
            </div>

            {/* Быстрые мессенджеры */}
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                {loc('Надіслати у месенджери', 'Share to messengers', 'Отправить в мессенджеры')}
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs font-bold font-mono">
                {/* Telegram */}
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent((product?.name || 'ERASERHEAD') + ' — ' + formatPrice(product?.price || 0))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={playClickSound}
                  className="flex items-center justify-center gap-2 p-2.5 bg-[#111111] border border-zinc-700 hover:border-sky-400 hover:text-sky-300 text-zinc-200 transition-colors btn-press"
                >
                  <span>✈</span> Telegram
                </a>

                {/* WhatsApp */}
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent((product?.name || 'ERASERHEAD') + ' — ' + window.location.href)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={playClickSound}
                  className="flex items-center justify-center gap-2 p-2.5 bg-[#111111] border border-zinc-700 hover:border-emerald-400 hover:text-emerald-300 text-zinc-200 transition-colors btn-press"
                >
                  <span>💬</span> WhatsApp
                </a>

                {/* Viber */}
                <a
                  href={`viber://forward?text=${encodeURIComponent((product?.name || 'ERASERHEAD') + ' ' + window.location.href)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={playClickSound}
                  className="flex items-center justify-center gap-2 p-2.5 bg-[#111111] border border-zinc-700 hover:border-purple-400 hover:text-purple-300 text-zinc-200 transition-colors btn-press"
                >
                  <span>🟣</span> Viber
                </a>

                {/* Twitter / X */}
                <a
                  href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent((product?.name || 'ERASERHEAD') + ' // ERASERHEAD ARCHIVE')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={playClickSound}
                  className="flex items-center justify-center gap-2 p-2.5 bg-[#111111] border border-zinc-700 hover:border-white hover:text-white text-zinc-200 transition-colors btn-press"
                >
                  <span>𝕏</span> Twitter
                </a>
              </div>
            </div>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="text-[11px] text-zinc-500 hover:text-zinc-300 uppercase tracking-widest cursor-pointer"
              >
                {loc('Закрити вікно', 'Close window', 'Закрыть окно')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
