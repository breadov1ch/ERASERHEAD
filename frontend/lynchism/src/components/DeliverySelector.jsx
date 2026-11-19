import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from '../i18n';

export const getCarriers = (loc) => [
  {
    id: 'Nova Poshta',
    name: loc('Нова Пошта', 'Nova Post', 'Новая Почта'),
    badge: loc('1-2 ДНІ', '1-2 DAYS', '1-2 ДНЯ'),
    color: 'text-zinc-300 border-zinc-700 bg-zinc-900',
    types: [
      { id: 'Warehouse', name: loc('Відділення', 'Branch / Office', 'Отделение'), time: loc('1-2 дні', '1-2 days', '1-2 дня') },
      { id: 'Postomat', name: loc('Поштомат', 'Postomat (Locker)', 'Почтомат'), time: loc('1-2 дні', '1-2 days', '1-2 дня') },
      { id: 'Courier', name: loc('Кур\'єр на адресу', 'Courier Delivery', 'Курьер на адрес'), time: loc('1-2 дні', '1-2 days', '1-2 дня') },
    ]
  },
  {
    id: 'Ukrposhta',
    name: loc('Укрпошта', 'Ukrposhta', 'Укрпочта'),
    badge: loc('2-4 ДНІ', '2-4 DAYS', '2-4 ДНЯ'),
    color: 'text-zinc-300 border-zinc-700 bg-zinc-900',
    types: [
      { id: 'Warehouse', name: loc('Укрпошта Стандарт', 'Ukrposhta Standard', 'Укрпочта Стандарт'), time: loc('3-5 днів', '3-5 days', '3-5 дней') },
      { id: 'Express', name: loc('Укрпошта Експрес', 'Ukrposhta Express', 'Укрпочта Экспресс'), time: loc('2-3 дні', '2-3 days', '2-3 дня') },
      { id: 'Courier', name: loc('Кур\'єрська доставка', 'Courier Service', 'Курьерская доставка'), time: loc('2-3 дні', '2-3 days', '2-3 дня') },
    ]
  },
  {
    id: 'Meest',
    name: loc('Meest Пошта', 'Meest Post', 'Meest Почта'),
    badge: loc('2-3 ДНІ', '2-3 DAYS', '2-3 ДНЯ'),
    color: 'text-zinc-300 border-zinc-700 bg-zinc-900',
    types: [
      { id: 'Warehouse', name: loc('Відділення / Точка видачі', 'Branch / Pickup point', 'Отделение / Точка выдачи'), time: loc('2-3 дні', '2-3 days', '2-3 дня') },
      { id: 'Postomat', name: loc('Поштомат Meest', 'Meest Postomat', 'Почтомат Meest'), time: loc('2-3 дні', '2-3 days', '2-3 дня') },
      { id: 'Courier', name: loc('Кур\'єр Meest', 'Meest Courier', 'Курьер Meest'), time: loc('2-3 дні', '2-3 days', '2-3 дня') },
    ]
  }
];

const POPULAR_CITIES = [
  'Київ', 'Дніпро', 'Львів', 'Одеса', 'Харків', 
  'Запоріжжя', 'Кривий Ріг', 'Вінниця', 'Полтава', 
  'Черкаси', 'Чернігів', 'Житомир', 'Хмельницький'
];

export const getBranchDescription = (b) => {
  if (!b) return '';
  if (typeof b === 'string') return b;
  if (typeof b !== 'object') return String(b);
  if (b.description && typeof b.description === 'string') return b.description;
  if (b.Description && typeof b.Description === 'string') return b.Description;
  if (b.name && b.address) return `${b.name} (${b.address}${b.postalCode ? `, ${b.postalCode}` : ''})`;
  if (b.name && typeof b.name === 'string') return b.name;
  if (b.address && typeof b.address === 'string') return b.address;
  if (b.city && b.address) return `${b.city}, ${b.address}`;
  if (b.id && typeof b.id === 'string') return b.id;
  return '';
};

export default function DeliverySelector({ 
  hasPreOrder, 
  onChange,
  initialCity = 'Дніпро'
}) {
  const { t, loc } = useTranslation();
  const CARRIERS = getCarriers(loc);

  const [selectedCarrier, setSelectedCarrier] = useState('Nova Poshta');
  const [deliveryType, setDeliveryType] = useState('Warehouse');
  
  // 1. Город
  const [cityInput, setCityInput] = useState(initialCity);
  const [selectedCity, setSelectedCity] = useState(initialCity);
  const [settlementRef, setSettlementRef] = useState('');
  const [deliveryCityRef, setDeliveryCityRef] = useState('');
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [isCityLoading, setIsCityLoading] = useState(false);
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);

  // 2. Отделения / Поштоматы
  const [branchSearch, setBranchSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [branchList, setBranchList] = useState([]);
  const [isBranchLoading, setIsBranchLoading] = useState(false);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);

  // Запасной ручной ввод для Укрпочты и Meest
  const [isManualBranch, setIsManualBranch] = useState(false);
  const [manualBranchText, setManualBranchText] = useState('');

  // 3. Курьерская доставка по адресу (3 структурированных инпута)
  const [courierStreet, setCourierStreet] = useState('');
  const [courierHouse, setCourierHouse] = useState('');
  const [courierApartment, setCourierApartment] = useState('');
  const [streetSuggestions, setStreetSuggestions] = useState([]);
  const [isStreetLoading, setIsStreetLoading] = useState(false);
  const [isStreetDropdownOpen, setIsStreetDropdownOpen] = useState(false);

  const cityDropdownRef = useRef(null);
  const branchDropdownRef = useRef(null);
  const streetDropdownRef = useRef(null);

  const cityDebounceRef = useRef(null);
  const branchDebounceRef = useRef(null);
  const streetDebounceRef = useRef(null);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const currentCarrierObj = CARRIERS.find(c => c.id === selectedCarrier) || CARRIERS[0];
  const currentTypeObj = currentCarrierObj.types.find(t => t.id === deliveryType) || currentCarrierObj.types[0];

  // Проверка закрытых поштоматов (лайфхак: предупреждение о подъездах и закрытой территории)
  const isRestrictedBranch = (desc) => {
    const text = typeof desc === 'string' ? desc : getBranchDescription(desc);
    return /(тільки для мешканців|только для жителей|закрит|закрыт|для співробітників|для сотрудников)/i.test(text || '');
  };

  const isSelectedRestricted = isRestrictedBranch(selectedBranch);

  // Закрытие выпадающих списков при клике вне
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target)) {
        setIsCityDropdownOpen(false);
      }
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(event.target)) {
        setIsBranchDropdownOpen(false);
      }
      if (streetDropdownRef.current && !streetDropdownRef.current.contains(event.target)) {
        setIsStreetDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 1. Поиск города через Nova Poshta API (searchSettlements)
  const searchCities = useCallback(async (query) => {
    if (!query || query.trim().length < 2) {
      setCitySuggestions([]);
      setIsCityLoading(false);
      return;
    }
    setIsCityLoading(true);
    try {
      const response = await fetch('https://api.novaposhta.ua/v2.0/json/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: '',
          modelName: 'AddressGeneral',
          calledMethod: 'searchSettlements',
          methodProperties: {
            CityName: query.trim(),
            Limit: '10'
          }
        })
      });
      const resData = await response.json();
      if (resData.success && resData.data && resData.data[0]?.Addresses) {
        setCitySuggestions(resData.data[0].Addresses);
      } else {
        setCitySuggestions([]);
      }
    } catch (err) {
      console.warn('City search fallback:', err);
      const filtered = POPULAR_CITIES
        .filter(c => c.toLowerCase().includes(query.toLowerCase()))
        .map(c => ({ MainDescription: c, Present: c, Ref: '' }));
      setCitySuggestions(filtered);
    } finally {
      setIsCityLoading(false);
    }
  }, []);

  const handleCityInputChange = (e) => {
    const val = e.target.value;
    setCityInput(val);
    setIsCityDropdownOpen(true);
    if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current);
    cityDebounceRef.current = setTimeout(() => {
      searchCities(val);
    }, 250);
  };

  const handleSelectCity = (item) => {
    const cityName = item.MainDescription || item.Present || item;
    setSelectedCity(cityName);
    setCityInput(cityName);
    setSettlementRef(item.Ref || '');
    setDeliveryCityRef(item.DeliveryCity || '');
    setIsCityDropdownOpen(false);
    setBranchSearch('');
    setSelectedBranch('');
    setStreetSuggestions([]);
  };

  // 2. Поиск отделений и поштоматов (НОВА ПОШТА)
  const fetchNovaPoshtaWarehouses = useCallback(async (cityName, searchStr, sRef, cityRef, type) => {
    if (!cityName) return;
    setIsBranchLoading(true);

    try {
      const methodProps = {
        CityName: cityName,
        Limit: '60'
      };

      if (cityRef) {
        methodProps.CityRef = cityRef;
      }
      if (sRef) {
        methodProps.SettlementRef = sRef;
      }
      if (searchStr && searchStr.trim()) {
        methodProps.FindByString = searchStr.trim();
      }

      const response = await fetch('https://api.novaposhta.ua/v2.0/json/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: '',
          modelName: 'AddressGeneral',
          calledMethod: 'getWarehouses',
          methodProperties: methodProps
        })
      });

      const resData = await response.json();
      if (resData.success && Array.isArray(resData.data)) {
        let items = resData.data;

        // Фильтрация: CategoryOfWarehouse (Postomat vs Branch/Store)
        if (type === 'Postomat') {
          items = items.filter(w => 
            w.CategoryOfWarehouse === 'Postomat' || 
            w.TypeOfWarehouse === 'f9316480-5f2d-425d-bc2c-ac7cd29decf0' ||
            /поштомат/i.test(w.Description || '')
          );
        } else {
          // Отделения и пункты приёма-выдачи (Branch, Store)
          items = items.filter(w => 
            (w.CategoryOfWarehouse === 'Branch' || w.CategoryOfWarehouse === 'Store' || !w.CategoryOfWarehouse) && 
            !/поштомат/i.test(w.Description || '')
          );
        }

        setBranchList(items);

        // Устанавливаем отделение по умолчанию ТОЛЬКО если у пользователя нет выбранного
        // или если текущее выбранное отсутствует в списке
        if (items.length > 0 && !searchStr) {
          const firstDesc = getBranchDescription(items[0]);
          setSelectedBranch(prev => {
            const prevStr = typeof prev === 'string' ? prev : getBranchDescription(prev);
            if (prevStr && items.some(w => getBranchDescription(w) === prevStr)) {
              return prevStr; // сохраняем выбор пользователя!
            }
            return firstDesc;
          });
        }
      } else {
        setBranchList([]);
      }
    } catch (err) {
      console.warn('Nova Poshta error:', err);
      const fallbackList = type === 'Postomat' ? [
        { Description: `Поштомат №101 (вул. Центральна, 1)` },
        { Description: `Поштомат №102 (просп. Миру, 25)` },
        { Description: `Поштомат №105 (ТЦ Плаза)` },
      ] : [
        { Description: `Відділення №1: вул. Повітряна, 2` },
        { Description: `Відділення №2: просп. Богдана Хмельницького, 31` },
        { Description: `Відділення №5: вул. Шевченка, 10` },
      ];
      setBranchList(fallbackList);
      setSelectedBranch(prev => {
        if (prev && fallbackList.some(w => getBranchDescription(w) === prev)) {
          return prev;
        }
        return fallbackList[0].Description;
      });
    } finally {
      setIsBranchLoading(false);
    }
  }, []);

  // Запуск загрузки отделений при смене города/службы/формата (ТОЛЬКО для Новой Почты с официальным API)
  useEffect(() => {
    if (deliveryType === 'Courier') return;
    if (selectedCarrier !== 'Nova Poshta') return;

    fetchNovaPoshtaWarehouses(selectedCity, '', settlementRef, deliveryCityRef, deliveryType);
  }, [selectedCity, deliveryType, selectedCarrier, settlementRef, deliveryCityRef, fetchNovaPoshtaWarehouses]);

  // Поиск улиц для курьерской доставки через Nova Poshta searchSettlementStreets
  const searchStreets = useCallback(async (query) => {
    if (!query || query.trim().length < 2) {
      setStreetSuggestions([]);
      setIsStreetLoading(false);
      return;
    }
    setIsStreetLoading(true);
    try {
      const response = await fetch('https://api.novaposhta.ua/v2.0/json/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: '',
          modelName: 'AddressGeneral',
          calledMethod: 'searchSettlementStreets',
          methodProperties: {
            StreetName: query.trim(),
            SettlementRef: settlementRef || '',
            Limit: '10'
          }
        })
      });
      const resData = await response.json();
      if (resData.success && resData.data && resData.data[0]?.Addresses) {
        setStreetSuggestions(resData.data[0].Addresses);
      } else {
        setStreetSuggestions([]);
      }
    } catch (err) {
      setStreetSuggestions([]);
    } finally {
      setIsStreetLoading(false);
    }
  }, [settlementRef]);

  const handleStreetInputChange = (e) => {
    const val = e.target.value;
    setCourierStreet(val);
    setIsStreetDropdownOpen(true);
    if (streetDebounceRef.current) clearTimeout(streetDebounceRef.current);
    streetDebounceRef.current = setTimeout(() => {
      searchStreets(val);
    }, 250);
  };

  const handleSelectStreet = (st) => {
    const name = st.SettlementStreetDescription || st.Present || st;
    setCourierStreet(name);
    setIsStreetDropdownOpen(false);
  };

  const handleBranchSearchChange = (e) => {
    const val = e.target.value;
    setBranchSearch(val);
    setIsBranchDropdownOpen(true);

    if (branchDebounceRef.current) clearTimeout(branchDebounceRef.current);
    branchDebounceRef.current = setTimeout(() => {
      if (selectedCarrier === 'Nova Poshta') {
        fetchNovaPoshtaWarehouses(selectedCity, val, settlementRef, deliveryCityRef, deliveryType);
      }
    }, 250);
  };

  const handleSelectBranch = (branch) => {
    const desc = typeof branch === 'string' ? branch : getBranchDescription(branch);
    setSelectedBranch(desc);
    setBranchSearch('');
    setIsBranchDropdownOpen(false);
  };

  // Передача данных в родительскую форму чекаута
  useEffect(() => {
    let fullAddress = '';
    let branchValue = '';

    if (deliveryType === 'Courier') {
      const hasStreetAndHouse = Boolean(courierStreet.trim() && courierHouse.trim());
      branchValue = loc(
        `вул. ${courierStreet}, буд. ${courierHouse}${courierApartment ? `, кв. ${courierApartment}` : ''}`,
        `St. ${courierStreet}, bldg. ${courierHouse}${courierApartment ? `, apt. ${courierApartment}` : ''}`,
        `ул. ${courierStreet}, д. ${courierHouse}${courierApartment ? `, кв. ${courierApartment}` : ''}`
      ).trim();
      fullAddress = hasStreetAndHouse ? `${selectedCity}, ${branchValue}` : '';
    } else if (selectedCarrier !== 'Nova Poshta') {
      branchValue = manualBranchText.trim();
      fullAddress = branchValue ? `${selectedCity}, ${branchValue}` : '';
    } else if (isManualBranch) {
      branchValue = manualBranchText.trim();
      fullAddress = branchValue ? `${selectedCity}, ${branchValue}` : '';
    } else {
      const bStr = typeof selectedBranch === 'string' ? selectedBranch : getBranchDescription(selectedBranch);
      branchValue = bStr || (typeof branchSearch === 'string' ? branchSearch : '');
      fullAddress = branchValue ? `${selectedCity}, ${branchValue}` : '';
    }

    if (onChangeRef.current) {
      onChangeRef.current({
        carrier: currentCarrierObj.name,
        carrierId: currentCarrierObj.id,
        deliveryType: currentTypeObj.name,
        deliveryTypeId: currentTypeObj.id,
        city: selectedCity,
        branch: branchValue,
        fullAddress: fullAddress,
        deliveryCost: 0,
        timeEstimate: hasPreOrder ? loc('10–14 робочих днів', '10–14 business days', '10–14 рабочих дней') : currentTypeObj.time,
        isRestrictedLocation: isSelectedRestricted
      });
    }
  }, [
    selectedCarrier, deliveryType, selectedCity, selectedBranch, branchSearch, 
    isManualBranch, manualBranchText, courierStreet, courierHouse, courierApartment, 
    hasPreOrder, currentCarrierObj, currentTypeObj, isSelectedRestricted, loc
  ]);

  return (
    <div className="space-y-4 font-mono text-xs">

      {/* 1. Выбор перевозчика */}
      <div>
        <label className="text-zinc-400 uppercase tracking-[0.15em] text-[10px] mb-2 block font-bold">
          {t("checkout_select_carrier")}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {CARRIERS.map(carrier => {
            const isSelected = selectedCarrier === carrier.id;
            return (
              <button
                key={carrier.id}
                type="button"
                onClick={() => {
                  setSelectedCarrier(carrier.id);
                  setDeliveryType(carrier.types[0].id);
                  setSelectedBranch('');
                  setBranchSearch('');
                  setIsManualBranch(false);
                }}
                className={`p-3 text-left border transition-all cursor-pointer font-mono ${
                  isSelected 
                    ? 'border-white bg-[#1e1e1e] text-white shadow-md' 
                    : 'border-zinc-800 bg-[#111111] text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-xs uppercase tracking-wider text-white">
                    {carrier.name}
                  </span>
                  {!hasPreOrder && (
                    <span className={`text-[9px] px-1.5 py-0.5 border font-bold uppercase ${carrier.color}`}>
                      {carrier.badge}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Тип доставки перевозчика */}
      <div>
        <label className="text-zinc-400 uppercase tracking-[0.15em] text-[10px] mb-2 block font-bold">
          {t("checkout_delivery_format")}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono">
          {currentCarrierObj.types.map(tObj => {
            const isSelected = deliveryType === tObj.id;
            return (
              <button
                key={tObj.id}
                type="button"
                onClick={() => {
                  setDeliveryType(tObj.id);
                  setSelectedBranch('');
                  setBranchSearch('');
                  setIsManualBranch(false);
                }}
                className={`p-2.5 border text-left cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-zinc-300 bg-zinc-900 text-white font-bold' 
                    : 'border-zinc-800 bg-[#111] text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="text-xs uppercase">{tObj.name}</div>
                {!hasPreOrder && (
                  <div className="text-[10px] text-zinc-400 mt-0.5 font-normal">
                    {tObj.time}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Город и Отделение / Адрес курьера */}
      <div className="space-y-4">
        
        {/* Город */}
        <div className="relative" ref={cityDropdownRef}>
          <label className="text-zinc-500 uppercase tracking-[0.15em] text-[10px] mb-1 flex justify-between items-center">
            <span>{t("checkout_city_label")}</span>
            {isCityLoading && <span className="text-zinc-400 lowercase animate-pulse text-[9px]">{loc('пошук міста...', 'searching city...', 'поиск города...')}</span>}
          </label>
          <div className="relative">
            <input
              type="text"
              value={cityInput}
              onChange={handleCityInputChange}
              onFocus={() => setIsCityDropdownOpen(true)}
              placeholder={t("checkout_city_placeholder")}
              className="w-full font-mono bg-[#111111] border border-zinc-700 text-white p-2.5 text-xs outline-none focus:border-zinc-300 transition-colors"
              required
            />
            {cityInput && (
              <button
                type="button"
                onClick={() => {
                  setCityInput('');
                  setSelectedCity('');
                  setCitySuggestions([]);
                  setIsCityDropdownOpen(true);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs px-1"
                title={loc('Очистити', 'Clear', 'Очистить')}
              >
                ✕
              </button>
            )}
          </div>

          {/* Выпадающий список городов */}
          {isCityDropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-[#141414] border border-zinc-700 shadow-2xl z-50 max-h-64 overflow-y-auto font-mono text-xs divide-y divide-zinc-800/80">
              {citySuggestions.length > 0 ? (
                citySuggestions.map((item, idx) => (
                  <button
                    key={item.Ref || idx}
                    type="button"
                    onClick={() => handleSelectCity(item)}
                    className="w-full text-left p-2.5 hover:bg-zinc-800 text-zinc-200 hover:text-white transition-colors cursor-pointer flex flex-col"
                  >
                    <span className="font-bold text-white">{item.MainDescription || item.Present}</span>
                    {item.Present && item.Present !== item.MainDescription && (
                      <span className="text-[10px] text-zinc-400">{item.Present}</span>
                    )}
                  </button>
                ))
              ) : (
                <div className="p-2.5">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 font-bold">
                    {t("checkout_popular_cities")}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_CITIES.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleSelectCity({ MainDescription: c, Present: c, Ref: '' })}
                        className="px-2 py-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-500 text-zinc-300 hover:text-white text-[11px] cursor-pointer"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ВАРИАНТ А: КУРЬЕР НА АДРЕС (3 ИНПУТА: УЛИЦА С АВТОПОИСКОМ, ДОМ, КВАРТИРА) */}
        {deliveryType === 'Courier' ? (
          <div className="p-3.5 bg-[#141414] border border-zinc-700 space-y-3 font-mono">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white block">
              {loc('Адреса кур\'єрської доставки', 'Courier Delivery Address', 'Адрес курьерской доставки')}
            </span>

            {/* Улица с живым автодополнением */}
            <div className="relative" ref={streetDropdownRef}>
              <label className="text-zinc-500 uppercase tracking-[0.15em] text-[10px] mb-1 flex justify-between items-center">
                <span>{loc('Вулиця *', 'Street *', 'Улица *')}</span>
                {isStreetLoading && <span className="text-zinc-400 text-[9px] animate-pulse lowercase">{loc('пошук вулиць...', 'searching streets...', 'поиск улиц...')}</span>}
              </label>
              <input
                type="text"
                value={courierStreet}
                onChange={handleStreetInputChange}
                onFocus={() => { if (streetSuggestions.length > 0) setIsStreetDropdownOpen(true); }}
                placeholder={loc('Введіть назву вулиці (напр. Воскресенська, Шевченка)...', 'Street name...', 'Название улицы...')}
                className="w-full font-mono bg-[#111111] border border-zinc-700 text-white p-2.5 text-xs outline-none focus:border-zinc-300"
                required
              />

              {isStreetDropdownOpen && streetSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-[#141414] border border-zinc-700 shadow-2xl z-50 max-h-56 overflow-y-auto divide-y divide-zinc-800 font-mono text-xs">
                  {streetSuggestions.map((st, idx) => {
                    const stName = st.SettlementStreetDescription || st.Present;
                    return (
                      <button
                        key={st.SettlementStreetRef || idx}
                        type="button"
                        onClick={() => handleSelectStreet(st)}
                        className="w-full text-left p-2.5 hover:bg-zinc-800 text-zinc-200 hover:text-white transition-colors cursor-pointer"
                      >
                        <span className="font-bold text-white">{stName}</span>
                        {st.Present && st.Present !== stName && (
                          <span className="text-[10px] text-zinc-400 block">{st.Present}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Дом и Квартира */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-500 uppercase tracking-[0.15em] text-[10px] mb-1 block">
                  {loc('Будинок *', 'Building / House *', 'Дом *')}
                </label>
                <input
                  type="text"
                  value={courierHouse}
                  onChange={(e) => setCourierHouse(e.target.value)}
                  placeholder={loc("напр. 15, 24А", "e.g. 15, 24A", "напр. 15, 24А")}
                  className="w-full font-mono bg-[#111111] border border-zinc-700 text-white p-2.5 text-xs outline-none focus:border-zinc-300"
                  required
                />
              </div>

              <div>
                <label className="text-zinc-500 uppercase tracking-[0.15em] text-[10px] mb-1 block">
                  {loc('Квартира / Офіс', 'Apt / Suite (optional)', 'Квартира / Офис')}
                </label>
                <input
                  type="text"
                  value={courierApartment}
                  onChange={(e) => setCourierApartment(e.target.value)}
                  placeholder={loc("напр. 42", "e.g. 42", "напр. 42")}
                  className="w-full font-mono bg-[#111111] border border-zinc-700 text-white p-2.5 text-xs outline-none focus:border-zinc-300"
                />
              </div>
            </div>
          </div>
        ) : selectedCarrier !== 'Nova Poshta' ? (
          /* ВАРИАНТ Б: ДЛЯ УКРПОЧТЫ И MEEST — ПРЯМОЙ ВВОД ОТДЕЛЕНИЯ / ИНДЕКСА / ПОШТОМАТА */
          <div className="p-3.5 bg-[#141414] border border-zinc-700 space-y-2 font-mono">
            <label className="text-zinc-500 uppercase tracking-[0.15em] text-[10px] block">
              {selectedCarrier === 'Ukrposhta'
                ? loc('Номер відділення або 5-значний поштовий індекс *', 'Branch number or 5-digit postal code *', 'Номер отделения или 5-значный почтовый индекс *')
                : loc('Номер відділення, поштомату або адреса точки видачі *', 'Meest branch / postomat # or address *', 'Номер отделения, почтомата или адрес точки выдачи *')}
            </label>
            <input
              type="text"
              value={manualBranchText}
              onChange={(e) => setManualBranchText(e.target.value)}
              placeholder={
                selectedCarrier === 'Ukrposhta'
                  ? loc('напр. Відділення №5 (індекс 49005) або просп. Гагаріна, 28...', 'e.g. Branch #5 (index 49005) or address...', 'напр. Отделение №5 (индекс 49005) или просп. Гагарина, 28...')
                  : loc('напр. Відділення №12 (ТЦ Караван) або Поштомат №201...', 'e.g. Branch #12 or Postomat #201...', 'напр. Отделение №12 (ТЦ Караван) или Почтомат №201...')
              }
              className="w-full font-mono bg-[#111111] border border-zinc-700 text-white p-2.5 text-xs outline-none focus:border-zinc-300 transition-colors"
              required
            />
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              {selectedCarrier === 'Ukrposhta'
                ? loc(
                    '💡 Вкажіть зручне для вас відділення Укрпошти, 5-значний поштовий індекс або адресу для отримання посилки.',
                    '💡 Enter your local Ukrposhta branch #, 5-digit postal code or street address.',
                    '💡 Укажите удобное отделение Укрпочты, 5-значный почтовый индекс или адрес для получения посылки.'
                  )
                : loc(
                    '💡 Вкажіть номер відділення Meest, поштомату або адресу точки видачі.',
                    '💡 Enter your Meest branch #, postomat # or pickup location.',
                    '💡 Укажите номер отделения Meest, почтомата или адрес точки выдачи.'
                  )}
            </p>
          </div>
        ) : (
          /* ВАРИАНТ В: ДЛЯ НОВОЙ ПОЧТЫ — ВЫБОР ОТДЕЛЕНИЯ ИЛИ ПОШТОМАТА ЧЕРЕЗ API НОВОЙ ПОЧТЫ */
          <div className="relative" ref={branchDropdownRef}>
            <div className="flex justify-between items-center mb-1">
              <label className="text-zinc-500 uppercase tracking-[0.15em] text-[10px]">
                {deliveryType === 'Postomat' ? t("checkout_postomat_label") : t("checkout_branch_label")}
              </label>
            </div>
            {/* Выбор из реального списка отделений */}
            <div>
                {selectedBranch ? (
                  <div className="space-y-2">
                    <div 
                      onClick={() => {
                        setIsBranchDropdownOpen(!isBranchDropdownOpen);
                        setBranchSearch('');
                      }}
                      className="p-2.5 bg-[#141414] border border-zinc-600 flex justify-between items-center gap-2 font-mono cursor-pointer hover:border-zinc-400 transition-colors"
                    >
                      <div className="text-xs text-white leading-snug truncate">
                        <span className="text-emerald-400 font-bold mr-1.5">✓</span>
                        {typeof selectedBranch === 'string' ? selectedBranch : getBranchDescription(selectedBranch)}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] uppercase text-zinc-400 hover:text-white tracking-wider underline">
                          {t("checkout_change_btn")}
                        </span>
                        <span className="text-zinc-400 text-xs">
                          {isBranchDropdownOpen ? '▲' : '▼'}
                        </span>
                      </div>
                    </div>

                    {/* Подсветка закрытых поштоматов (лайфхак: только для жителей) */}
                    {isSelectedRestricted && (
                      <div className="p-2.5 bg-amber-950/20 border border-amber-600/50 text-[11px] text-amber-300 font-mono flex items-start gap-2">
                        <span>⚠️</span>
                        <span>
                          {loc(
                            'Увага: цей пункт розташований на закритій території (у під\'їзді або ЖК). Переконайтеся, що ви маєте доступ для отримання.',
                            'Attention: this location has restricted access (residential building or gated area). Ensure you have entry access.',
                            'Внимание: этот пункт расположен на закрытой территории (в подъезде или ЖК). Убедитесь, что у вас есть доступ для получения.'
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={branchSearch}
                      onChange={handleBranchSearchChange}
                      onFocus={() => setIsBranchDropdownOpen(true)}
                      placeholder={
                        deliveryType === 'Postomat'
                          ? t("checkout_postomat_search_placeholder")
                          : t("checkout_branch_search_placeholder")
                      }
                      className="w-full font-mono bg-[#111111] border border-zinc-700 text-white p-2.5 text-xs outline-none focus:border-zinc-300 transition-colors pr-8"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs cursor-pointer"
                    >
                      ▼
                    </button>
                  </div>
                )}

                {/* Выпадающий список реальных отделений с автодополнением */}
                {isBranchDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-[#141414] border border-zinc-700 shadow-2xl z-50 max-h-72 overflow-y-auto font-mono text-xs divide-y divide-zinc-800/80">
                    <div className="p-2 bg-[#0e0e0e] sticky top-0 border-b border-zinc-800 z-10">
                      <input
                        type="text"
                        value={branchSearch}
                        onChange={handleBranchSearchChange}
                        placeholder={loc('Пошук за номером, вулицею чи індексом...', 'Search by #, street or postal code...', 'Поиск по номеру, улице или индексу...')}
                        className="w-full bg-[#181818] border border-zinc-700 text-white p-2 text-xs outline-none focus:border-zinc-400 font-mono"
                        autoFocus
                      />
                    </div>

                    {branchList.length > 0 ? (
                      branchList.map((b, idx) => {
                        const desc = getBranchDescription(b);
                        if (!desc) return null;
                        const isCurrent = (typeof selectedBranch === 'string' ? selectedBranch : getBranchDescription(selectedBranch)) === desc;
                        const restricted = isRestrictedBranch(desc) || Boolean(b.isRestricted);
                        const key = b.Ref || b.id || b.Id || `${desc}-${idx}`;

                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleSelectBranch(desc)}
                            className={`w-full text-left p-2.5 transition-colors cursor-pointer flex flex-col ${
                              isCurrent 
                                ? 'bg-zinc-800 text-white font-bold' 
                                : 'hover:bg-zinc-800/70 text-zinc-300 hover:text-white'
                            }`}
                          >
                            <span className="leading-snug">{desc}</span>
                            {restricted && (
                              <span className="text-[9px] font-bold text-amber-300 bg-amber-950/40 border border-amber-600/60 px-1.5 py-0.5 inline-block mt-1 w-fit">
                                ⚠️ {loc('ТІЛЬКИ ДЛЯ МЕШКАНЦІВ / ЗАКРИТА ТЕРИТОРІЯ', 'RESIDENTS ONLY / RESTRICTED ACCESS', 'ТОЛЬКО ДЛЯ ЖИТЕЛЕЙ / ЗАКРЫТАЯ ТЕРРИТОРИЯ')}
                              </span>
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-zinc-500 font-mono text-xs">
                        {isBranchLoading 
                          ? loc('Завантаження списку відділень...', 'Loading branches...', 'Загрузка списка отделений...') 
                          : loc('Відділень не знайдено за цим запитом.', 'No branches found for this query.', 'Отделений не найдено по этому запросу.')}
                      </div>
                    )}
                  </div>
                )}
              </div>
          </div>
        )}

      </div>

    </div>
  );
}
