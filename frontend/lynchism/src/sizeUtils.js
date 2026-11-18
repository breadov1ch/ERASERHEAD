export const SIZE_RANK_MAP = {
  '4XL': 90,
  'XXXL': 80,
  '3XL': 80,
  'XXL': 70,
  '2XL': 70,
  'XL': 60,
  'L': 50,
  'M': 40,
  'S': 30,
  'XS': 20,
  'XXS': 10,
  'ONE SIZE': 5,
  'ONESIZE': 5,
  'OS': 5
};

/**
 * Сортировка размеров от большего к меньшему (L -> M -> S):
 * XXL -> XL -> L -> M -> S -> XS -> ONE SIZE
 * Для числовых (джинсы/брюки 36, 34, 32): 36 -> 34 -> 32 -> 30
 */
export const sortSizesDesc = (sizes) => {
  if (!Array.isArray(sizes)) return [];

  return [...sizes].sort((a, b) => {
    const sizeA = (typeof a === 'string' ? a : (a?.size || '')).trim().toUpperCase();
    const sizeB = (typeof b === 'string' ? b : (b?.size || '')).trim().toUpperCase();

    const rankA = SIZE_RANK_MAP[sizeA];
    const rankB = SIZE_RANK_MAP[sizeB];

    // Оба есть в словаре стандартных размеров
    if (rankA !== undefined && rankB !== undefined) {
      return rankB - rankA; // Сначала больший ранг: L (50) перед M (40), M перед S (30)
    }

    // Числовые размеры (например, 36, 34, 32, 30)
    const numA = parseFloat(sizeA);
    const numB = parseFloat(sizeB);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numB - numA; // Сначала большее число
    }

    if (rankA !== undefined) return -1;
    if (rankB !== undefined) return 1;

    return sizeB.localeCompare(sizeA);
  });
};
