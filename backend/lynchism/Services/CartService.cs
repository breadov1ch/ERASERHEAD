using lynchism.Models;
using lynchism.DTO;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;

namespace lynchism.Services
{
    public class CartService
    {
        private readonly MyDbContext _context;

        public CartService(MyDbContext context)
        {
            _context = context;
        }
       
        public async Task<List<CartItemDTO>> GetCartByClientId(int id)
        {
            var items = await _context.CartItems
                .Include(c => c.Product)
                    .ThenInclude(p => p.Sizes)
                .Where(c => c.ClientId == id)
                .ToListAsync();

            return items.Select(c =>
            {
                bool isPreOrder = c.Product?.IsPreOrder ?? false;
                var sizeStock = c.Product?.Sizes?.FirstOrDefault(ps => ps.Size == c.Size)?.Quantity ?? 0;
                return new CartItemDTO
                {
                    Id = c.Id,
                    ProductId = c.ProductId,
                    ProductName = c.Product?.Name ?? string.Empty,
                    Price = c.Product?.Price ?? 0,
                    Size = c.Size,
                    Color = c.Color ?? string.Empty,
                    Quantity = c.Quantity,
                    ImageURL = c.Product?.ImageURL ?? string.Empty,
                    IsPreOrder = isPreOrder,
                    MaxStock = isPreOrder ? int.MaxValue : sizeStock
                };
            }).ToList();
        }
        public async Task<int> GetItemCount(int clientId) => await _context.CartItems
            .Where(ci => ci.ClientId == clientId)
            .CountAsync();
        public async Task<decimal> GetSum(int clientId) => await _context.CartItems
            .Where(c => c.ClientId == clientId)
            .SumAsync(c => c.Quantity * c.Product.Price);
        public async Task<List<CartItemDTO>?> AddToCart(CartItem item)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var product = await _context.Products
                    .Include(p => p.Sizes)
                    .FirstOrDefaultAsync(p => p.Id == item.ProductId);

                if (product == null) return null;

                bool isPreOrder = product.IsPreOrder;
                string cleanSize = string.IsNullOrWhiteSpace(item.Size) ? "ONE SIZE" : item.Size.Trim();
                var stock = product.Sizes?.FirstOrDefault(ps => 
                    string.Equals((ps.Size ?? "").Trim(), cleanSize, StringComparison.OrdinalIgnoreCase));

                if (!isPreOrder && product.Sizes != null && product.Sizes.Any())
                {
                    if (stock != null && stock.Quantity < item.Quantity)
                    {
                        return null;
                    }
                }

                var existingItem = await _context.CartItems
                    .FirstOrDefaultAsync(c => c.ClientId == item.ClientId
                                      && c.ProductId == item.ProductId
                                      && c.Size.ToLower() == cleanSize.ToLower()
                                      && (c.Color ?? string.Empty) == (item.Color ?? string.Empty));

                int newTotalQuantity = (existingItem?.Quantity ?? 0) + item.Quantity;

                if (!isPreOrder && stock != null && newTotalQuantity > stock.Quantity)
                {
                    return null;
                }
                if (existingItem != null)
                {
                    existingItem.Quantity = newTotalQuantity;
                }
                else
                {
                    item.Size = stock?.Size ?? cleanSize;
                    _context.CartItems.Add(item);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return await GetCartByClientId(item.ClientId);
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                return null;
            }
        }
        public async Task<bool> DeleteFromCart(int id)
        {
            CartItem? finded_cartItems = await _context.CartItems.FirstOrDefaultAsync(c => c.Id == id);
            if (finded_cartItems != null)
            {
                _context.Remove(finded_cartItems);
                await _context.SaveChangesAsync();
                return true;
            }
            return false;
        }
        public async Task<CartItem?> ChangeProductQuantity(int cartId, int quantity)
        {
            if (quantity <= 0) return null;

            var cartItem = await _context.CartItems.FirstOrDefaultAsync(c => c.Id == cartId);
            if (cartItem == null) return null;

            var product = await _context.Products
                .Include(p => p.Sizes)
                .FirstOrDefaultAsync(p => p.Id == cartItem.ProductId);

            if (product == null) return null;

            bool isPreOrder = product.IsPreOrder;
            if (isPreOrder)
            {
                cartItem.Quantity = quantity;
                await _context.SaveChangesAsync();
                return cartItem;
            }

            var productSize = product.Sizes.FirstOrDefault(ps => ps.Size == cartItem.Size);
            if (productSize != null && quantity <= productSize.Quantity)
            {
                cartItem.Quantity = quantity;
                await _context.SaveChangesAsync();
                return cartItem;
            }
            return null;
        }
    }
}
