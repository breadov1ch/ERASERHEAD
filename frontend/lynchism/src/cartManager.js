import { API_URL } from "./config";

const GUEST_CART_KEY = "eraserhead_guest_cart";

export const getGuestCart = () => {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Error reading guest cart:", e);
    return [];
  }
};

export const saveGuestCart = (items) => {
  try {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("cartUpdated"));
  } catch (e) {
    console.error("Error saving guest cart:", e);
  }
};

export const addToGuestCart = (product, size, quantity = 1, color = "") => {
  const items = getGuestCart();
  const cleanSize = (size || "ONE SIZE").trim();
  const cleanColor = (color || "").trim();

  const existingIndex = items.findIndex(
    item => item.productId === product.id && 
            (item.size || "ONE SIZE").trim().toLowerCase() === cleanSize.toLowerCase() && 
            (item.color || "").trim().toLowerCase() === cleanColor.toLowerCase()
  );

  const isPreOrder = Boolean(product.isPreOrder);
  let maxStock = isPreOrder ? Infinity : 9999;
  if (!isPreOrder && product.sizes && product.sizes.length > 0) {
    const sObj = product.sizes.find(s => (s.size || "").trim().toLowerCase() === cleanSize.toLowerCase());
    maxStock = sObj ? (sObj.quantity ?? 9999) : (product.maxStock ?? 9999);
  } else if (!isPreOrder && product.maxStock !== undefined) {
    maxStock = product.maxStock;
  }

  const existingQty = existingIndex > -1 ? items[existingIndex].quantity : 0;
  if (!isPreOrder && (existingQty + quantity) > maxStock) {
    return {
      success: false,
      maxReached: true,
      currentQty: existingQty,
      maxStock: maxStock,
      items
    };
  }

  if (existingIndex > -1) {
    items[existingIndex].quantity += quantity;
    items[existingIndex].isPreOrder = isPreOrder;
    items[existingIndex].maxStock = maxStock;
  } else {
    items.push({
      id: Date.now() + Math.floor(Math.random() * 1000),
      productId: product.id,
      name: product.name,
      price: product.price,
      imageURL: product.imageURL || (product.images && product.images[0]) || "",
      size: cleanSize,
      color: cleanColor,
      quantity: quantity,
      isPreOrder: isPreOrder,
      maxStock: maxStock
    });
  }

  saveGuestCart(items);
  return { success: true, items };
};

export const updateGuestCartQuantity = (id, quantity) => {
  let items = getGuestCart();
  if (quantity <= 0) {
    items = items.filter(item => item.id !== id);
  } else {
    items = items.map(item => {
      if (item.id === id) {
        if (!item.isPreOrder && item.maxStock !== undefined && quantity > item.maxStock) {
          return { ...item, quantity: item.maxStock };
        }
        return { ...item, quantity };
      }
      return item;
    });
  }
  saveGuestCart(items);
  return items;
};

export const removeFromGuestCart = (id) => {
  const items = getGuestCart().filter(item => item.id !== id);
  saveGuestCart(items);
  return items;
};

export const clearGuestCart = () => {
  localStorage.removeItem(GUEST_CART_KEY);
  window.dispatchEvent(new Event("cartUpdated"));
};

export const getGuestCartCount = () => {
  const items = getGuestCart();
  return items.reduce((sum, item) => sum + (item.quantity || 1), 0);
};

export const mergeGuestCartWithServer = async (token) => {
  const guestItems = getGuestCart();
  if (!guestItems.length || !token) return;

  try {
    const payload = guestItems.map(item => ({
      productId: item.productId,
      size: item.size,
      color: item.color || "",
      quantity: item.quantity
    }));

    const response = await fetch(`${API_URL}/Cart/merge-cart`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      clearGuestCart();
    }
  } catch (err) {
    console.error("Error merging guest cart:", err);
  }
};
