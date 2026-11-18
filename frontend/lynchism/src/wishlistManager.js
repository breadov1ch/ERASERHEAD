const WISHLIST_KEY = "eraserhead_wishlist";

export const getWishlist = () => {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

export const isInWishlist = (productId) => {
  const list = getWishlist();
  return list.includes(Number(productId));
};

export const toggleWishlist = (productId) => {
  const id = Number(productId);
  let list = getWishlist();
  if (list.includes(id)) {
    list = list.filter(item => item !== id);
  } else {
    list.push(id);
  }
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("wishlistUpdated"));
  return list.includes(id);
};

export const getWishlistCount = () => {
  return getWishlist().length;
};
