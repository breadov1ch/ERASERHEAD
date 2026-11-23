import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
    columns: ['Параметр 1', 'Параметр 2'],
    defaults: {}
  }
};

export default function ChangeProduct() {
  const navigate = useNavigate();
  const { id } = useParams(); 
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', isError: false });

  const [product, setProduct] = useState({
    name: '',
    description: '',
    price: 0,
    oldPrice: '',
    isNew: false,
    newDurationDays: '14',
    newUntil: '',
    category: 'Tops',
    gender: 'Unisex',
    silhouette: 'OVERSIZED',
    fabric: '100% COTTON',
    imageURL: '',
    images: [],
    sizes: [],
    isPreOrder: false
  });

  const [newImageUrl, setNewImageUrl] = useState('');
  const [customSizeName, setCustomSizeName] = useState('');

  // Расцветки
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

  // Таблица размеров
  const [sizeChartType, setSizeChartType] = useState('tops');
  const [chartColumns, setChartColumns] = useState(SIZE_TEMPLATES.tops.columns);
  const [chartRows, setChartRows] = useState(SIZE_TEMPLATES.tops.defaults);
  const [newColumnName, setNewColumnName] = useState('');

  const fetchProduct = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return navigate("/login");
    try {
      const response = await fetch(`${API_URL}/Product/${id}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!response.ok) {
        if (response.status === 401) {
          const isRefreshed = await refreshTokens();
          if (isRefreshed) return fetchProduct();
          return navigate("/login");
        }
        throw new Error("Товар не найден");
      }

      const data = await response.json();
      const isNewActive = Boolean(data.isNew && (!data.newUntil || new Date(data.newUntil) > new Date()));
      let daysRemaining = '14';
      if (data.newUntil) {
        const diffMs = new Date(data.newUntil) - new Date();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays > 0) {
          daysRemaining = String(diffDays);
        }
      } else if (data.isNew && !data.newUntil) {
        daysRemaining = 'permanent';
      }

      setProduct({
        ...data,
        oldPrice: data.oldPrice ?? '',
        isNew: isNewActive,
        newDurationDays: daysRemaining,
        gender: data.gender || 'Unisex',
        isPreOrder: Boolean(data.isPreOrder),
        images: data.images || (data.imageURL ? [data.imageURL] : []),
        sizes: data.sizes || []
      });

      // Загружаем сохраненную таблицу размеров
      if (data.sizeChartJson) {
        try {
          const parsed = JSON.parse(data.sizeChartJson);
          setSizeChartType(parsed.type || 'tops');
          setChartColumns(parsed.columns || []);
          setChartRows(parsed.rows || {});
        } catch {
          initChartFromCategory(data.category);
        }
      } else {
        initChartFromCategory(data.category);
      }

      // Загружаем сохраненные расцветки
      if (data.colorsJson) {
        try {
          const parsedColors = JSON.parse(data.colorsJson);
          if (Array.isArray(parsedColors)) setColors(parsedColors);
        } catch (e) {
          console.error(e);
        }
      }
    } catch (err) {
      setMsg({ text: err.message || "Ошибка загрузки", isError: true });
    }
  };

  const initChartFromCategory = (cat) => {
    const lower = (cat || '').toLowerCase();
    let type = 'tops';
    if (lower === 'pants' || lower.includes('брюк') || lower.includes('джинс')) {
      type = 'pants';
    } else if (lower === 'outerwear' || lower.includes('курт')) {
      type = 'outerwear';
    } else if (lower === 'accessories' || lower.includes('шапк') || lower.includes('аксесс')) {
      type = 'accessories';
    }
    setSizeChartType(type);
    const tmpl = SIZE_TEMPLATES[type] || SIZE_TEMPLATES.custom;
    setChartColumns([...tmpl.columns]);
    setChartRows({ ...tmpl.defaults });
  };

  useEffect(() => {
    if (id) fetchProduct();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProduct(prev => ({ 
      ...prev, 
      [name]: (name === 'price' || name === 'oldPrice') ? (value === '' ? '' : parseFloat(value) || 0) : value 
    }));
  };

  const handleSizeQuantityChange = (sizeName, qty) => {
    setProduct(prev => ({
      ...prev,
      sizes: prev.sizes.map(s => 
        s.size === sizeName ? { ...s, quantity: Math.max(0, parseInt(qty, 10) || 0) } : s
      )
    }));
  };

  const addCustomSize = () => {
    if (!customSizeName.trim()) return;
    const name = customSizeName.trim().toUpperCase();
    if (product.sizes.some(s => s.size === name)) return;

    setProduct(prev => ({
      ...prev,
      sizes: [...prev.sizes, { size: name, quantity: 10 }]
    }));

    if (!chartRows[name]) {
      const emptyRow = {};
      chartColumns.forEach(c => emptyRow[c] = '-');
      setChartRows(prev => ({ ...prev, [name]: emptyRow }));
    }
    setCustomSizeName('');
  };

  const removeSize = (sizeName) => {
    setProduct(prev => ({
      ...prev,
      sizes: prev.sizes.filter(s => s.size !== sizeName)
    }));
  };

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

  const handleSave = async (e) => {
    e.preventDefault();
    setMsg({ text: '', isError: false });

    const token = localStorage.getItem("access_token");
    if (!token) return navigate("/login");

    setLoading(true);

    const sizeChartPayload = {
      type: sizeChartType,
      title: SIZE_TEMPLATES[sizeChartType]?.title || 'Таблица параметров',
      columns: chartColumns,
      rows: chartRows
    };

    let finalNewUntil = null;
    if (product.isNew) {
      if (product.newDurationDays && product.newDurationDays !== 'permanent') {
        const days = parseInt(product.newDurationDays, 10) || 14;
        finalNewUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      }
    }

    const payload = {
      ...product,
      price: parseFloat(product.price) || 0,
      oldPrice: product.oldPrice ? parseFloat(product.oldPrice) : null,
      isNew: Boolean(product.isNew),
      newUntil: finalNewUntil,
      imageURL: product.images[0] || product.imageURL || '',
      images: product.images.length > 0 ? product.images : (product.imageURL ? [product.imageURL] : []),
      sizes: product.sizes,
      sizeChartJson: JSON.stringify(sizeChartPayload),
      colorsJson: colors.length > 0 ? JSON.stringify(colors) : null
    };

    try {
      let res = await fetch(`${API_URL}/Product/change/${id}`, {
        method: "PUT",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload) 
      });

      if (res.status === 401) {
        const refreshed = await refreshTokens();
        if (refreshed) {
          const freshToken = localStorage.getItem("access_token");
          res = await fetch(`${API_URL}/Product/change/${id}`, {
            method: "PUT",
            headers: { 
              "Authorization": `Bearer ${freshToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(payload) 
          });
        } else {
          return navigate("/login");
        }
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Не удалось сохранить товар");
      }

      setMsg({ text: "Товар, расцветки и параметры успешно обновлены!", isError: false });
      setTimeout(() => navigate('/admin'), 1200);
    } catch (err) {
      setMsg({ text: err.message || "Ошибка при сохранении", isError: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#131313] text-zinc-300 font-sans p-6 sm:p-10">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Шапка */}
        <div className="flex items-center justify-between border-b border-zinc-700 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 uppercase">
              <Link to="/admin" className="hover:text-white">Панель управления</Link>
              <span>/</span>
              <span className="text-white">Редактирование товара #{id}</span>
            </div>
            <h1 className="text-2xl font-black uppercase text-white mt-1">
              {product.name || `Товар #${id}`}
            </h1>
          </div>

          <Link
            to="/admin"
            className="border border-zinc-800 bg-black hover:bg-zinc-900 text-zinc-400 hover:text-white px-4 py-2 text-xs font-mono uppercase"
          >
            ← Назад к списку
          </Link>
        </div>

        {msg.text && (
          <div className={`p-4 border text-xs font-mono ${
            msg.isError ? 'bg-red-950/40 border-red-800 text-red-400' : 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
          }`}>
            {msg.text}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">

          {/* 1. Основные данные */}
          <div className="bg-[#0a0a0a] border border-zinc-800 p-6 space-y-4">
            <h2 className="text-sm font-bold uppercase text-white border-b border-zinc-800 pb-2">
              1. Основная информация
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-500 font-mono block mb-1">Название товара *</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={product.name}
                  onChange={handleChange}
                  className="w-full bg-black border border-zinc-800 p-2.5 text-xs text-white outline-none focus:border-zinc-500"
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 font-mono block mb-1">Тип изделия (Категория)</label>
                  <select
                    name="category"
                    value={product.category}
                    onChange={handleChange}
                    className="w-full bg-black border border-zinc-800 p-2.5 text-xs text-white outline-none focus:border-zinc-500 cursor-pointer"
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

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs text-zinc-300 font-mono">
                      Цена (₴ UAH, грн) *
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      name="price"
                      required
                      min="0"
                      step="1"
                      value={product.price}
                      onChange={handleChange}
                      placeholder="3200"
                      className="w-full bg-black border border-zinc-800 p-2.5 text-xs text-white font-mono outline-none focus:border-zinc-500 pr-14"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-zinc-400 font-mono font-bold">
                      ₴ UAH
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
                    Текущая цена для продажи
                  </span>
                </div>
              </div>

              {/* Старая цена для скидки */}
              <div className="border border-zinc-800 p-3 bg-[#111111]">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-zinc-300 font-mono">
                    Старая цена (₴ UAH, байт на скидку)
                  </label>
                  {product.oldPrice && parseFloat(product.oldPrice) > parseFloat(product.price) && (
                    <span className="text-[10px] font-bold text-red-400 bg-red-950/60 border border-red-800/80 px-2 py-0.5">
                      Скидка -{Math.round(((parseFloat(product.oldPrice) - parseFloat(product.price)) / parseFloat(product.oldPrice)) * 100)}% (экономия {Math.round(parseFloat(product.oldPrice) - parseFloat(product.price))} ₴)
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    name="oldPrice"
                    min="0"
                    step="1"
                    value={product.oldPrice || ''}
                    onChange={handleChange}
                    placeholder="Например: 3900 (если скидки нет — оставьте пустым)"
                    className="w-full bg-black border border-zinc-800 p-2.5 text-xs text-white font-mono outline-none focus:border-zinc-500 pr-14"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-zinc-400 font-mono font-bold">
                    ₴ UAH
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
                  Если указана и выше текущей цены — на сайте старая цена будет зачеркнута красным и появится ярлык скидки.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-500 font-mono block mb-1">Силуэт / Крой</label>
                <input
                  type="text"
                  name="silhouette"
                  value={product.silhouette}
                  onChange={handleChange}
                  placeholder="напр. OVERSIZED, WIDE-LEG, ONE SIZE"
                  className="w-full bg-black border border-zinc-800 p-2.5 text-xs text-white outline-none focus:border-zinc-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-500 font-mono block mb-1">Состав ткани</label>
                <input
                  type="text"
                  name="fabric"
                  value={product.fabric}
                  onChange={handleChange}
                  placeholder="напр. 100% COTTON, DENIM"
                  className="w-full bg-black border border-zinc-800 p-2.5 text-xs text-white outline-none focus:border-zinc-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-500 font-mono block mb-1">Описание товара</label>
              <textarea
                name="description"
                rows="3"
                value={product.description}
                onChange={handleChange}
                className="w-full bg-black border border-zinc-800 p-2.5 text-xs text-white outline-none focus:border-zinc-500 leading-relaxed"
              />
            </div>

            {/* Переключатель Предзаказа */}
            <div className="p-4 bg-[#141414] border border-amber-500/40 space-y-2">
              <label className="flex items-start sm:items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="isPreOrder"
                  checked={Boolean(product.isPreOrder)}
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

            {/* Плашка НОВОЕ (NEW DROP) и настройка срока активности */}
            <div className="p-4 bg-[#141414] border border-zinc-700 space-y-3 font-mono">
              <label className="flex items-start sm:items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="isNew"
                  checked={Boolean(product.isNew)}
                  onChange={(e) => setProduct(prev => ({ ...prev, isNew: e.target.checked }))}
                  className="w-4 h-4 mt-0.5 sm:mt-0 accent-white cursor-pointer"
                />
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-white block">
                    ★ Плашка «НОВОЕ» (NEW DROP) на карточке товара
                  </span>
                  <span className="text-[11px] text-zinc-400 font-mono block mt-0.5">
                    Отображает бейдж [NEW] на карточке товара в каталоге и на странице товара.
                  </span>
                </div>
              </label>

              {product.isNew && (
                <div className="pl-7 pt-2 border-t border-zinc-800/80 space-y-3">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 block">
                    Срок активности плашки:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { key: '7', label: '7 ДНЕЙ' },
                      { key: '14', label: '14 ДНЕЙ' },
                      { key: '30', label: '30 ДНЕЙ' },
                      { key: 'permanent', label: 'БЕССРОЧНО' }
                    ].map(item => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setProduct(prev => ({ ...prev, newDurationDays: item.key }))}
                        className={`py-2 px-3 text-xs font-bold uppercase border transition-colors cursor-pointer text-center ${
                          product.newDurationDays === item.key
                            ? 'bg-white text-black border-white'
                            : 'bg-black text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-white'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-zinc-500 font-mono">
                    {product.newDurationDays === 'permanent'
                      ? 'Плашка будет активна постоянно, пока вы не отключите ее вручную.'
                      : `Плашка автоматически исчезнет через ${product.newDurationDays || 14} дн. без необходимости вручную заходить в админку.`}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 2. Фотографии */}
          <div className="bg-[#0a0a0a] border border-zinc-800 p-6 space-y-4">
            <h2 className="text-sm font-bold uppercase text-white border-b border-zinc-800 pb-2">
              2. Фотографии товара
            </h2>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="URL фотографии (https://...)"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                className="flex-grow bg-black border border-zinc-800 px-3 py-2 text-xs text-white outline-none focus:border-zinc-500 font-mono"
              />
              <button
                type="button"
                onClick={addImage}
                className="bg-white text-black px-4 py-2 font-bold text-xs uppercase"
              >
                + Добавить фото
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-2">
              {product.images.map((img, idx) => (
                <div key={idx} className="relative group border border-zinc-800 bg-black aspect-[3/4] overflow-hidden">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex flex-col justify-between p-2 transition-opacity">
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="self-end text-red-400 hover:text-red-200 text-xs font-bold"
                    >
                      ✕
                    </button>
                    {idx === 0 ? (
                      <span className="bg-white text-black text-[9px] font-bold uppercase px-1 py-0.5 text-center">
                        Обложка
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAsCover(idx)}
                        className="bg-zinc-800 hover:bg-zinc-700 text-white text-[9px] uppercase px-1 py-0.5"
                      >
                        Сделать главной
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Размеры на складе */}
          <div className="bg-[#0a0a0a] border border-zinc-800 p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
              <h2 className="text-sm font-bold uppercase text-white">
                3. Размеры на складе (Складские остатки)
              </h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Размер (напр. ONE SIZE, 32)"
                  value={customSizeName}
                  onChange={(e) => setCustomSizeName(e.target.value)}
                  className="bg-black border border-zinc-800 px-2 py-1 text-xs text-white font-mono w-48 outline-none"
                />
                <button
                  type="button"
                  onClick={addCustomSize}
                  className="border border-zinc-700 bg-zinc-900 text-white px-3 py-1 text-xs uppercase"
                >
                  + Добавить
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {sortSizesDesc(product.sizes).map((s) => (
                <div key={s.size} className="bg-black border border-zinc-800 p-3 flex flex-col items-center relative">
                  <button
                    type="button"
                    onClick={() => removeSize(s.size)}
                    className="absolute top-1 right-2 text-zinc-500 hover:text-red-400 text-xs"
                  >
                    ✕
                  </button>
                  <span className="font-bold text-white uppercase text-sm mt-1">{s.size}</span>
                  <div className="mt-2 w-full">
                    <label className="text-[10px] text-zinc-500 block mb-0.5 text-center">Остаток (шт):</label>
                    <input
                      type="number"
                      min="0"
                      value={s.quantity}
                      onChange={(e) => handleSizeQuantityChange(s.size, e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 text-white text-center py-1 text-xs font-mono font-bold outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Расцветки товара */}
          <div className="bg-[#0a0a0a] border border-zinc-800 p-6 space-y-4">
            <div className="border-b border-zinc-800 pb-2">
              <h2 className="text-sm font-bold uppercase text-white">
                4. Вариации расцветок (Цвета товара)
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Добавьте варианты цветов, если товар выпускается в нескольких цветах. Покупатель сможет переключать расцветку на карточке товара.
              </p>
            </div>

            {/* Быстрые пресеты */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-zinc-500 uppercase font-mono block">Быстрые расцветки:</span>
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
                    className="border border-zinc-800 bg-black hover:border-white text-zinc-300 hover:text-white px-2.5 py-1 text-xs font-mono flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="w-2.5 h-2.5 rounded-full border border-zinc-700" style={{ backgroundColor: preset.hex }} />
                    <span>+ {preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Добавление вручную */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-900">
              <input
                type="color"
                value={newColorHex}
                onChange={(e) => setNewColorHex(e.target.value)}
                className="w-8 h-8 rounded-none border border-zinc-700 bg-black cursor-pointer p-0"
              />
              <input
                type="text"
                placeholder="Название цвета (напр. Acid Wash, Camo)"
                value={newColorName}
                onChange={(e) => setNewColorName(e.target.value)}
                className="bg-black border border-zinc-800 px-3 py-1.5 text-xs text-white font-mono w-60 outline-none"
              />
              <button
                type="button"
                onClick={() => addColor(newColorName, newColorHex)}
                className="border border-zinc-700 bg-zinc-900 text-white px-4 py-1.5 text-xs uppercase font-bold"
              >
                + Добавить цвет
              </button>
            </div>

            {/* Активные расцветки */}
            {colors.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-2">
                {colors.map((c, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-black border border-zinc-700 px-3 py-1 text-xs font-mono text-white">
                    <span className="w-3 h-3 rounded-full border border-zinc-500" style={{ backgroundColor: c.hex || '#000000' }} />
                    <span className="font-bold">{c.name}</span>
                    <button
                      type="button"
                      onClick={() => removeColor(idx)}
                      className="text-zinc-500 hover:text-red-400 text-xs ml-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-zinc-600 font-mono italic">
                Цвета не добавлены (товар одного цвета по умолчанию).
              </p>
            )}
          </div>

          {/* 5. Таблица параметров */}
          <div className="bg-[#0a0a0a] border border-zinc-800 p-6 space-y-4">
            <div className="flex flex-wrap justify-between items-center border-b border-zinc-800 pb-2 gap-2">
              <h2 className="text-sm font-bold uppercase text-white">
                5. Таблица замеров и параметров изделия
              </h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Новая колонка (напр. Длина)"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  className="bg-black border border-zinc-800 px-2 py-1 text-xs text-white font-mono w-44 outline-none"
                />
                <button
                  type="button"
                  onClick={addColumn}
                  className="border border-zinc-700 bg-zinc-900 text-white px-3 py-1 text-xs uppercase"
                >
                  + Колонка
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-zinc-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-950 text-zinc-400 border-b border-zinc-800 uppercase">
                    <th className="p-3 w-28 border-r border-zinc-800 font-bold text-white">Размер</th>
                    {chartColumns.map((col) => (
                      <th key={col} className="p-3 border-r border-zinc-800 last:border-r-0 min-w-[130px]">
                        <div className="flex items-center justify-between gap-1">
                          <span>{col}</span>
                          <button
                            type="button"
                            onClick={() => removeColumn(col)}
                            className="text-zinc-600 hover:text-red-400 text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 bg-black">
                  {product.sizes.map((s) => (
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
                            placeholder="значение"
                            className="w-full bg-transparent border border-transparent hover:border-zinc-800 focus:border-zinc-500 px-2 py-1 text-xs text-white outline-none font-mono"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Link
              to="/admin"
              className="bg-black hover:bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 font-bold uppercase px-6 py-3 text-xs"
            >
              Отмена
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="bg-white hover:bg-zinc-200 text-black font-black uppercase tracking-wider px-8 py-3 text-xs shadow-lg cursor-pointer disabled:opacity-50"
            >
              {loading ? "Сохранение..." : "Сохранить изменения →"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
