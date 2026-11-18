import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { refreshTokens } from '../../api';
import { API_URL } from '../../config';
import { sortSizesDesc } from '../../sizeUtils';

const SIZE_TEMPLATES = {
  pants: {
    title: 'Брюки / Джинсы',
    columns: ['Талия (см)', 'Бедра (см)', 'Длина (см)', 'Ширина низа (см)'],
    defaults: {
      'S': { 'Талия (см)': '78-80', 'Бедра (см)': '102', 'Длина (см)': '106', 'Ширина низа (см)': '24' },
      'M': { 'Талия (см)': '82-84', 'Бедра (см)': '106', 'Длина (см)': '108', 'Ширина низа (см)': '25' },
      'L': { 'Талия (см)': '86-88', 'Бедра (см)': '110', 'Длина (см)': '110', 'Ширина низа (см)': '26' },
      'XL': { 'Талия (см)': '90-94', 'Бедра (см)': '116', 'Длина (см)': '112', 'Ширина низа (см)': '27' },
      'XXL': { 'Талия (см)': '96-100', 'Бедра (см)': '122', 'Длина (см)': '114', 'Ширина низа (см)': '28' }
    }
  },
  tops: {
    title: 'Футболки / Худи',
    columns: ['Обхват груди (см)', 'Длина изделия (см)', 'Плечи (см)', 'Рукав (см)'],
    defaults: {
      'S': { 'Обхват груди (см)': '112', 'Длина изделия (см)': '71', 'Плечи (см)': '54', 'Рукав (см)': '22' },
      'M': { 'Обхват груди (см)': '118', 'Длина изделия (см)': '73', 'Плечи (см)': '56', 'Рукав (см)': '23' },
      'L': { 'Обхват груди (см)': '124', 'Длина изделия (см)': '75', 'Плечи (см)': '58', 'Рукав (см)': '24' },
      'XL': { 'Обхват груди (см)': '130', 'Длина изделия (см)': '77', 'Плечи (см)': '60', 'Рукав (см)': '25' },
      'XXL': { 'Обхват груди (см)': '136', 'Длина изделия (см)': '79', 'Плечи (см)': '62', 'Рукав (см)': '26' }
    }
  },
  outerwear: {
    title: 'Куртки / Верхняя одежда',
    columns: ['Обхват груди (см)', 'Длина куртки (см)', 'Плечи (см)', 'Рукав (см)'],
    defaults: {
      'S': { 'Обхват груди (см)': '120', 'Длина куртки (см)': '68', 'Плечи (см)': '56', 'Рукав (см)': '64' },
      'M': { 'Обхват груди (см)': '126', 'Длина куртки (см)': '70', 'Плечи (см)': '58', 'Рукав (см)': '66' },
      'L': { 'Обхват груди (см)': '132', 'Длина куртки (см)': '72', 'Плечи (см)': '60', 'Рукав (см)': '68' },
      'XL': { 'Обхват груди (см)': '138', 'Длина куртки (см)': '74', 'Плечи (см)': '62', 'Рукав (см)': '70' },
      'XXL': { 'Обхват груди (см)': '144', 'Длина куртки (см)': '76', 'Плечи (см)': '64', 'Рукав (см)': '72' }
    }
  },
  accessories: {
    title: 'Головные уборы / Аксессуары (One Size)',
    columns: ['Обхват головы / Размер (см)', 'Глубина посадки (см)'],
    defaults: {
      'ONE SIZE': { 'Обхват головы / Размер (см)': '55-62', 'Глубина посадки (см)': '18-22' }
    }
  },
  custom: {
    title: 'Пользовательский шаблон',
    columns: ['Длина (см)', 'Ширина (см)'],
    defaults: {}
  }
};

export default function CreateProduct() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [product, setProduct] = useState({
    name: '',
    category: 'Tops',
    gender: 'Unisex',
    price: 3200,
    description: '',
    silhouette: 'OVERSIZED',
    fabric: '100% COTTON 480 GSM',
    imageURL: '',
    images: [],
    isPreOrder: false
  });

  const [newImageUrl, setNewImageUrl] = useState('');

  const [sizes, setSizes] = useState([
    { size: 'S', quantity: 10 },
    { size: 'M', quantity: 15 },
    { size: 'L', quantity: 10 },
    { size: 'XL', quantity: 5 },
    { size: 'XXL', quantity: 0 }
  ]);

  const [customSizeName, setCustomSizeName] = useState('');

  // Состояние расцветок товара
  const [colors, setColors] = useState([]);
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#000000');

  const addColor = (name, hex) => {
    const cName = (name || newColorName).trim();
    if (!cName) return;
    const cHex = hex || newColorHex || '#000000';
    if (!colors.some(c => (typeof c === 'string' ? c : c.name).toLowerCase() === cName.toLowerCase())) {
      setColors(prev => [...prev, { name: cName, hex: cHex }]);
    }
    setNewColorName('');
  };

  const removeColor = (index) => {
    setColors(prev => prev.filter((_, i) => i !== index));
  };

  // Состояние таблицы параметров размеров
  const [sizeChartType, setSizeChartType] = useState('tops');
  const [chartColumns, setChartColumns] = useState(SIZE_TEMPLATES.tops.columns);
  const [chartRows, setChartRows] = useState(SIZE_TEMPLATES.tops.defaults);
  const [newColumnName, setNewColumnName] = useState('');

  // При переключении шаблона подгружаем соответствующие колонки и дефолты
  const applySizeTemplate = (type) => {
    setSizeChartType(type);
    const tmpl = SIZE_TEMPLATES[type] || SIZE_TEMPLATES.custom;
    setChartColumns([...tmpl.columns]);
    
    // Сохраняем значения для имеющихся размеров или заполняем из шаблона
    const newRows = {};
    sizes.forEach(s => {
      newRows[s.size] = { ...(tmpl.defaults[s.size] || {}) };
    });
    setChartRows(newRows);
  };

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setProduct(prev => ({
      ...prev,
      [name]: name === 'price' ? parseFloat(value) || 0 : value
    }));
    if (name === 'category') {
      const lower = value.toLowerCase();
      if (lower === 'pants' || lower.includes('брюк') || lower.includes('джинс')) {
        applySizeTemplate('pants');
      } else if (lower === 'outerwear' || lower.includes('курт')) {
        applySizeTemplate('outerwear');
      } else {
        applySizeTemplate('tops');
      }
    }
  };

  const handleSizeQuantityChange = (sizeName, qty) => {
    setSizes(prev => prev.map(s => 
      s.size === sizeName ? { ...s, quantity: Math.max(0, parseInt(qty, 10) || 0) } : s
    ));
  };

  const adjustQty = (sizeName, delta) => {
    setSizes(prev => prev.map(s => {
      if (s.size !== sizeName) return s;
      const newQty = Math.max(0, s.quantity + delta);
      return { ...s, quantity: newQty };
    }));
  };

  const addCustomSize = () => {
    if (!customSizeName.trim()) return;
    const name = customSizeName.trim().toUpperCase();
    if (!sizes.some(s => s.size === name)) {
      setSizes(prev => [...prev, { size: name, quantity: 10 }]);
      setChartRows(prev => ({
        ...prev,
        [name]: { ...(SIZE_TEMPLATES[sizeChartType]?.defaults[name] || {}) }
      }));
    }
    setCustomSizeName('');
  };

  const removeSize = (sizeName) => {
    setSizes(prev => prev.filter(s => s.size !== sizeName));
    setChartRows(prev => {
      const copy = { ...prev };
      delete copy[sizeName];
      return copy;
    });
  };

  // Управление колонками параметров таблицы размеров
  const addColumn = () => {
    if (!newColumnName.trim()) return;
    const col = newColumnName.trim();
    if (!chartColumns.includes(col)) {
      setChartColumns(prev => [...prev, col]);
    }
    setNewColumnName('');
  };

  const removeColumn = (colName) => {
    setChartColumns(prev => prev.filter(c => c !== colName));
    setChartRows(prev => {
      const updated = {};
      Object.keys(prev).forEach(sz => {
        const rowData = { ...prev[sz] };
        delete rowData[colName];
        updated[sz] = rowData;
      });
      return updated;
    });
  };

  // Редактирование ячейки замера конкретного размера
  const handleMeasurementChange = (sizeName, colName, value) => {
    setChartRows(prev => ({
      ...prev,
      [sizeName]: {
        ...(prev[sizeName] || {}),
        [colName]: value
      }
    }));
  };

  const addImage = () => {
    if (!newImageUrl.trim()) return;
    const url = newImageUrl.trim();
    setProduct(prev => {
      const updated = [...prev.images, url];
      return {
        ...prev,
        images: updated,
        imageURL: prev.imageURL || url
      };
    });
    setNewImageUrl('');
  };

  const removeImage = (index) => {
    setProduct(prev => {
      const updated = prev.images.filter((_, i) => i !== index);
      return {
        ...prev,
        images: updated,
        imageURL: updated[0] || ''
      };
    });
  };

  const setAsCover = (index) => {
    setProduct(prev => {
      const target = prev.images[index];
      const rest = prev.images.filter((_, i) => i !== index);
      return {
        ...prev,
        imageURL: target,
        images: [target, ...rest]
      };
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!product.name.trim()) {
      setError('Введите название товара');
      return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) return navigate('/login');

    setLoading(true);

    const sizeChartPayload = {
      type: sizeChartType,
      title: SIZE_TEMPLATES[sizeChartType]?.title || 'Таблица параметров',
      columns: chartColumns,
      rows: chartRows
    };

    const payload = {
      ...product,
      imageURL: product.images[0] || product.imageURL || '',
      images: product.images.length > 0 ? product.images : (product.imageURL ? [product.imageURL] : []),
      sizes: sizes,
      sizeChartJson: JSON.stringify(sizeChartPayload),
      colorsJson: colors.length > 0 ? JSON.stringify(colors) : null
    };

    try {
      let res = await fetch(`${API_URL}/Product/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.status === 401) {
        const refreshed = await refreshTokens();
        if (refreshed) {
          const freshToken = localStorage.getItem('access_token');
          res = await fetch(`${API_URL}/Product/create`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${freshToken}`
            },
            body: JSON.stringify(payload)
          });
        } else {
          return navigate('/login');
        }
      }

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Не удалось создать товар');
      }

      const created = await res.json();
      setSuccess(`Товар успешно добавлен! ID #${created.id}`);
      setTimeout(() => navigate('/admin'), 1200);
    } catch (err) {
      setError(err.message || 'Ошибка сервера при создании товара');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#131313] text-zinc-100 min-h-screen py-10 px-4 sm:px-6 lg:px-8 font-mono">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Заголовок */}
        <div className="border-b border-zinc-700 pb-4 flex justify-between items-center">
          <div>
            <span className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] block font-mono">
              INVENTORY // CATALOG_MANAGEMENT
            </span>
            <h1 className="text-2xl sm:text-3xl font-black uppercase text-white mt-1 tracking-tight">
              Создание товара
            </h1>
          </div>
          <Link
            to="/admin"
            className="text-xs uppercase tracking-widest font-bold bg-black hover:bg-white hover:text-black text-white px-4 py-2 border border-zinc-800 transition-colors"
          >
            ← В панель управления
          </Link>
        </div>

        {error && (
          <div className="p-4 bg-red-950/60 border border-red-800 text-red-200 text-xs uppercase tracking-wider">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs uppercase tracking-wider">
            {success}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-8">
          
          {/* 1. Основные данные */}
          <div className="bg-[#0a0a0a] border border-zinc-800 p-6 sm:p-8 space-y-6 shadow-xl">
            <h2 className="text-sm font-black uppercase tracking-wider text-white border-b border-zinc-800 pb-3">
              1. Основная информация
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Название товара *</label>
                <input
                  required
                  type="text"
                  name="name"
                  value={product.name}
                  onChange={handleFieldChange}
                  placeholder="Например: Sterling Chain Flare Denim"
                  className="w-full bg-black border border-zinc-800 px-3.5 py-2.5 text-xs text-white outline-none focus:border-zinc-500 font-mono"
                />
              </div>

              {/* Категория по полу */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Категория (Мужское / Женское / Унисекс) *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'Unisex', label: 'Унисекс' },
                    { key: 'Men', label: 'Мужское' },
                    { key: 'Women', label: 'Женское' }
                  ].map((g) => (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => setProduct(prev => ({ ...prev, gender: g.key }))}
                      className={`py-2 px-3 text-xs font-bold uppercase tracking-wider border cursor-pointer font-mono transition-all ${
                        product.gender === g.key
                          ? 'bg-amber-400 text-black border-amber-300 font-black shadow-md'
                          : 'bg-black text-zinc-400 border-zinc-800 hover:border-zinc-500 hover:text-white'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Тип изделия (Категория) *</label>
                <select
                  name="category"
                  value={product.category}
                  onChange={handleFieldChange}
                  className="w-full bg-black border border-zinc-800 px-3.5 py-2.5 text-xs text-white outline-none focus:border-zinc-500 cursor-pointer font-mono"
                >
                  <option value="Hoodies">Худи и Зипперы</option>
                  <option value="TShirts">Футболки</option>
                  <option value="Sweatpants">Спортивные штаны</option>
                  <option value="Shorts">Шорты</option>
                  <option value="Pants">Штаны и джинсы</option>
                  <option value="Sweaters">Свитшоты и свитера</option>
                  <option value="WinterJackets">Зимние пуховики и куртки</option>
                  <option value="MidseasonJackets">Демисезонные куртки</option>
                  <option value="Windbreakers">Ветровки</option>
                  <option value="Headwear">Головные уборы (Шапки, ушанки, кепки)</option>
                  <option value="Accessories">Аксессуары (Ремни, сумки, цепи)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Цена (₴ UAH, грн) *
                </label>
                <div className="relative">
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    name="price"
                    value={product.price}
                    onChange={handleFieldChange}
                    placeholder="Например: 3200"
                    className="w-full bg-black border border-zinc-800 px-3.5 py-2.5 text-xs text-white outline-none focus:border-zinc-500 font-mono pr-14"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-zinc-400 font-mono font-bold">
                    ₴ UAH
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono block">
                  Указывайте цену в гривнах (UAH). На сайте она автоматически конвертируется в USD/EUR для клиентов из других стран.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Силуэт / Крой</label>
                <input
                  type="text"
                  name="silhouette"
                  value={product.silhouette}
                  onChange={handleFieldChange}
                  placeholder="OVERSIZED / BOXY FIT"
                  className="w-full bg-black border border-zinc-800 px-3.5 py-2.5 text-xs text-white outline-none focus:border-zinc-500 font-mono"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Состав и ткань</label>
                <input
                  type="text"
                  name="fabric"
                  value={product.fabric}
                  onChange={handleFieldChange}
                  placeholder="100% COTTON 480 GSM / RAW SELVEDGE DENIM"
                  className="w-full bg-black border border-zinc-800 px-3.5 py-2.5 text-xs text-white outline-none focus:border-zinc-500 font-mono"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Описание изделия</label>
                <textarea
                  rows="3"
                  name="description"
                  value={product.description}
                  onChange={handleFieldChange}
                  placeholder="Опишите фурнитуру, выварку ткани, особенности кроя..."
                  className="w-full bg-black border border-zinc-800 px-3.5 py-2.5 text-xs text-white outline-none focus:border-zinc-500 font-mono"
                />
              </div>

              {/* Переключатель Предзаказа */}
              <div className="md:col-span-2 p-4 bg-[#141414] border border-amber-500/40 space-y-2">
                <label className="flex items-start sm:items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isPreOrder"
                    checked={product.isPreOrder}
                    onChange={(e) => setProduct(prev => ({ ...prev, isPreOrder: e.target.checked }))}
                    className="w-4 h-4 mt-0.5 sm:mt-0 accent-amber-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-amber-300 block">
                      ★ Товар доступен по предзаказу (Pre-order)
                    </span>
                    <span className="text-[11px] text-zinc-400 font-mono block mt-0.5">
                      Если включено, количество товара считается неограниченным. Покупатели смогут добавлять в корзину и заказывать любое количество без ограничений остатков на складе.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* 2. Фотографии товара */}
          <div className="bg-[#0a0a0a] border border-zinc-800 p-6 sm:p-8 space-y-6 shadow-xl">
            <h2 className="text-sm font-black uppercase tracking-wider text-white border-b border-zinc-800 pb-3">
              2. Фотографии товара
            </h2>

            <div className="flex gap-2">
              <input
                type="url"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="Вставьте ссылку на фото (https://...)"
                className="flex-1 bg-black border border-zinc-800 px-3.5 py-2 text-xs text-white outline-none focus:border-zinc-500 font-mono"
              />
              <button
                type="button"
                onClick={addImage}
                className="bg-white text-black font-bold uppercase tracking-wider px-4 py-2 text-xs hover:bg-zinc-200 transition-colors"
              >
                + Добавить
              </button>
            </div>

            {product.images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                {product.images.map((url, idx) => (
                  <div key={idx} className="relative bg-black border border-zinc-800 p-2 overflow-hidden group">
                    <img
                      src={url}
                      alt={`preview ${idx}`}
                      className="w-full aspect-[3/4] object-contain"
                    />
                    {idx === 0 && (
                      <span className="absolute top-3 left-3 bg-white text-black text-[9px] font-bold uppercase px-1.5 py-0.5">
                        Обложка
                      </span>
                    )}
                    <div className="mt-2 flex justify-between gap-1 text-[10px] uppercase font-mono">
                      {idx !== 0 && (
                        <button
                          type="button"
                          onClick={() => setAsCover(idx)}
                          className="text-zinc-400 hover:text-white"
                        >
                          Сделать главной
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="text-red-400 hover:text-red-300 ml-auto"
                      >
                        ✕ Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Размеры и количество на складе */}
          <div className="bg-[#0a0a0a] border border-zinc-800 p-6 sm:p-8 space-y-5 shadow-xl">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-zinc-800 pb-3 gap-2">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-white">
                  3. Наличие размеров на складе
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Укажите количество единиц в наличии для каждого размера
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customSizeName}
                  onChange={(e) => setCustomSizeName(e.target.value)}
                  placeholder="Свой размер (напр. XS, 32)"
                  className="w-40 bg-black border border-zinc-800 px-3 py-1.5 text-xs text-white outline-none focus:border-zinc-500 font-mono"
                />
                <button
                  type="button"
                  onClick={addCustomSize}
                  className="bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 px-3 py-1.5 text-xs font-bold uppercase tracking-wider"
                >
                  + Добавить
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
              {sortSizesDesc(sizes).map((s) => {
                const inStock = s.quantity > 0;

                return (
                  <div key={s.size} className="bg-black border border-zinc-800 p-3.5 flex flex-col items-center space-y-2 relative">
                    <button
                      type="button"
                      onClick={() => removeSize(s.size)}
                      className="absolute top-1 right-2 text-zinc-600 hover:text-red-400 text-xs"
                      title="Удалить этот размер"
                    >
                      ✕
                    </button>

                    <div className="flex justify-between items-center w-full pt-1">
                      <span className="text-sm font-bold text-white uppercase">{s.size}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 border ${inStock ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
                        {inStock ? `${s.quantity} шт.` : '0 шт.'}
                      </span>
                    </div>

                    <div className="w-full flex items-center justify-between gap-1 pt-1">
                      <button
                        type="button"
                        onClick={() => adjustQty(s.size, -1)}
                        className="w-7 h-7 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs border border-zinc-800"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={s.quantity}
                        onChange={(e) => handleSizeQuantityChange(s.size, e.target.value)}
                        className="w-14 text-center bg-black border border-zinc-800 text-white py-1 text-xs font-bold outline-none focus:border-zinc-500"
                      />
                      <button
                        type="button"
                        onClick={() => adjustQty(s.size, 1)}
                        className="w-7 h-7 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs border border-zinc-800"
                      >
                        +
                      </button>
                    </div>

                    <div className="flex gap-1 w-full pt-1">
                      <button
                        type="button"
                        onClick={() => adjustQty(s.size, 10)}
                        className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 py-0.5 text-[10px] uppercase font-mono"
                      >
                        +10
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSizeQuantityChange(s.size, 0)}
                        className="bg-zinc-900 hover:bg-red-950/60 text-zinc-500 hover:text-red-300 px-2 py-0.5 text-[10px]"
                        title="Обнулить"
                      >
                        0
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. ТАБЛИЦА РАЗМЕРОВ И ЗАМЕРОВ ДЛЯ ПОКУПАТЕЛЕЙ (ИНТЕРАКТИВНЫЙ КОНСТРУКТОР) */}
          <div className="bg-[#0a0a0a] border border-zinc-800 p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-zinc-800 pb-4 gap-3">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-white">
                  4. Таблица размеров и индивидуальные замеры
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Выберите тип изделия и укажите точные параметры (см) для каждого размера
                </p>
              </div>

              {/* Выбор типа одежды */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => applySizeTemplate('pants')}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border transition-all ${
                    sizeChartType === 'pants' ? 'bg-white text-black border-white' : 'bg-black text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-600'
                  }`}
                >
                  Джинсы / Брюки
                </button>
                <button
                  type="button"
                  onClick={() => applySizeTemplate('tops')}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border transition-all ${
                    sizeChartType === 'tops' ? 'bg-white text-black border-white' : 'bg-black text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-600'
                  }`}
                >
                  Футболки / Худи
                </button>
                <button
                  type="button"
                  onClick={() => applySizeTemplate('outerwear')}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border transition-all ${
                    sizeChartType === 'outerwear' ? 'bg-white text-black border-white' : 'bg-black text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-600'
                  }`}
                >
                  Куртки
                </button>
                <button
                  type="button"
                  onClick={() => applySizeTemplate('custom')}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border transition-all ${
                    sizeChartType === 'custom' ? 'bg-white text-black border-white' : 'bg-black text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-600'
                  }`}
                >
                  Свой тип
                </button>
              </div>
            </div>

            {/* Добавление нового параметра (колонки) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-black border border-zinc-900 p-3">
              <span className="text-xs text-zinc-400 uppercase tracking-wider">
                Активный тип: <strong className="text-white">{SIZE_TEMPLATES[sizeChartType]?.title || 'Пользовательский'}</strong>
              </span>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="Добавить замер (напр. Талия, Длина...)"
                  className="bg-[#0a0a0a] border border-zinc-800 px-3 py-1.5 text-xs text-white outline-none focus:border-zinc-500 font-mono w-56"
                />
                <button
                  type="button"
                  onClick={addColumn}
                  className="bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 px-3 py-1.5 text-xs uppercase font-bold tracking-wider"
                >
                  + Колонка
                </button>
              </div>
            </div>

            {/* Таблица ввода параметров по размерам */}
            <div className="overflow-x-auto border border-zinc-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-950 text-zinc-400 border-b border-zinc-800 uppercase tracking-wider">
                    <th className="p-3 w-28 border-r border-zinc-800 font-bold text-white">Размер</th>
                    {chartColumns.map((col) => (
                      <th key={col} className="p-3 border-r border-zinc-800 last:border-r-0 relative group min-w-[130px]">
                        <div className="flex items-center justify-between gap-2">
                          <span>{col}</span>
                          <button
                            type="button"
                            onClick={() => removeColumn(col)}
                            className="text-zinc-600 hover:text-red-400 text-xs px-1"
                            title="Удалить колонку"
                          >
                            ✕
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 bg-black">
                  {sizes.map((s) => (
                    <tr key={s.size} className="hover:bg-zinc-950/40">
                      <td className="p-3 font-bold text-white uppercase border-r border-zinc-800 bg-zinc-950/30">
                        {s.size}
                      </td>
                      {chartColumns.map((col) => (
                        <td key={col} className="p-2 border-r border-zinc-800 last:border-r-0">
                          <input
                            type="text"
                            value={chartRows[s.size]?.[col] || ''}
                            onChange={(e) => handleMeasurementChange(s.size, col, e.target.value)}
                            placeholder="напр. 78-80"
                            className="w-full bg-transparent border border-transparent hover:border-zinc-800 focus:border-zinc-500 px-2 py-1 text-xs text-white outline-none font-mono"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-[11px] text-zinc-500 uppercase tracking-wider leading-relaxed">
              * Покупатель в карточке товара увидит ТОЛЬКО эту готовую таблицу с введенными вами параметрами (без лишних вкладок и чужих замеров).
            </p>
          </div>

          {/* 5. Вариации расцветок товара */}
          <div className="bg-[#0a0a0a] border border-zinc-800 p-6 sm:p-8 space-y-5 shadow-xl">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-zinc-800 pb-3 gap-2">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-white">
                  5. Вариации расцветок (Цвета товара)
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Добавьте варианты цветов, если товар выпускается в нескольких расцветках (напр. Black, Grey, Olive). Если товар одного цвета, этот блок можно оставить пустым.
                </p>
              </div>
            </div>

            {/* Быстрые шаблоны цветов */}
            <div className="space-y-2">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">
                Быстрые популярные расцветки (кликните чтобы добавить):
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: 'Black', hex: '#0a0a0a' },
                  { name: 'Washed Grey', hex: '#3d3d3d' },
                  { name: 'Graphite', hex: '#222222' },
                  { name: 'White', hex: '#ffffff' },
                  { name: 'Khaki', hex: '#4b5320' },
                  { name: 'Olive', hex: '#556b2f' },
                  { name: 'Beige', hex: '#c2b280' },
                  { name: 'Brown', hex: '#4a3b32' }
                ].map(preset => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => addColor(preset.name, preset.hex)}
                    className="border border-zinc-800 bg-black hover:border-white text-zinc-300 hover:text-white px-2.5 py-1 text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <span className="w-2.5 h-2.5 rounded-full border border-zinc-700" style={{ backgroundColor: preset.hex }} />
                    <span>+ {preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Ручное добавление цвета */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-zinc-900">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={newColorHex}
                  onChange={(e) => setNewColorHex(e.target.value)}
                  className="w-8 h-8 rounded-none border border-zinc-700 bg-black cursor-pointer p-0"
                  title="Выбрать оттенок цвета"
                />
                <input
                  type="text"
                  placeholder="Название цвета (напр. Vintage Black, Sand)"
                  value={newColorName}
                  onChange={(e) => setNewColorName(e.target.value)}
                  className="bg-black border border-zinc-800 px-3 py-1.5 text-xs text-white outline-none focus:border-zinc-500 font-mono w-64"
                />
              </div>
              <button
                type="button"
                onClick={() => addColor(newColorName, newColorHex)}
                className="bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700 px-4 py-1.5 text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                + Добавить свой цвет
              </button>
            </div>

            {/* Список добавленных цветов */}
            {colors.length > 0 ? (
              <div className="space-y-2 pt-2">
                <span className="text-[11px] text-zinc-400 font-mono">
                  Активные расцветки товара (покупатель сможет выбирать их на сайте):
                </span>
                <div className="flex flex-wrap gap-2.5">
                  {colors.map((c, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center gap-2 bg-black border border-zinc-700 px-3 py-1.5 text-xs font-mono text-white"
                    >
                      <span 
                        className="w-3.5 h-3.5 rounded-full border border-zinc-500 shrink-0" 
                        style={{ backgroundColor: c.hex || '#000000' }} 
                      />
                      <span className="font-bold">{c.name}</span>
                      <button
                        type="button"
                        onClick={() => removeColor(idx)}
                        className="text-zinc-500 hover:text-red-400 text-xs ml-1 cursor-pointer"
                        title="Удалить этот цвет"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-zinc-600 font-mono italic">
                Цвета не добавлены (товар будет отображаться как стандартный без переключателя расцветок).
              </p>
            )}
          </div>

          {/* Кнопка отправки */}
          <div className="flex justify-end gap-4 pt-4">
            <Link
              to="/admin"
              className="bg-black hover:bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 font-bold uppercase tracking-wider px-6 py-3.5 text-xs transition-colors"
            >
              Отмена
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="bg-white hover:bg-zinc-200 text-black font-black uppercase tracking-[0.2em] px-8 py-3.5 text-xs transition-all shadow-xl cursor-pointer disabled:opacity-50"
            >
              {loading ? "Сохранение..." : "Опубликовать товар →"}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
