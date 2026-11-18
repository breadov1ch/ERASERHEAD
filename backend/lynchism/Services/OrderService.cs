
using lynchism.DTO;
using lynchism.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace lynchism.Services
{
    public class OrderService
    {
        private readonly MyDbContext _context;

        public OrderService(MyDbContext context)
        {
            _context = context;
        }
        public async Task<List<CartItem>> GetCartItems(int clientId) => await _context.CartItems
            .Include(c => c.Product)
            .Where(x => x.ClientId == clientId)
            .ToListAsync();
        public async Task<List<Order>> GetAll() => await _context.Orders
            .Include(o => o.Products)
             .ThenInclude(oi => oi.Product)
            .Include(o => o.Client)
            .Where(o => o.Status != "Completed")
            .ToListAsync();
        public async Task<Order?> GetOrderByOrderId(int orderId) => await _context.Orders
         .Include(o => o.Products)
             .ThenInclude(oi => oi.Product)
         .Include(o => o.Client)
         .FirstOrDefaultAsync(o => o.Id == orderId);
        public async Task<Order?> GetOrder(int orderId, int clientId) => await _context.Orders
         .Include(o => o.Products)
             .ThenInclude(oi => oi.Product)
         .Include(o => o.Client)
         .FirstOrDefaultAsync(o => o.Id == orderId && o.ClientId == clientId);
        public async Task<decimal> GetSum(int clientId)
        {
            var items = await _context.CartItems
                .Include(c => c.Product)
                .Where(c => c.ClientId == clientId)
                .ToListAsync();
            return items.Sum(c => c.Quantity * c.Product.Price);
        }
        public async Task<List<OrderDTO>> GetOrderByClientId(int id) => await _context.Orders
            .Include(o => o.Products)
                .ThenInclude(oi => oi.Product)
            .Include(o => o.Client)
            .Where(o => o.ClientId == id)
            .OrderByDescending(o => o.DateOfIssuance)
            .Select(o => new OrderDTO
            {
                Id = o.Id,
                Date = o.DateOfIssuance,
                Status = o.Status,
                TotalSum = o.Sum,
                StreetAddress = o.StreetAddress,
                Phone = o.Phone,
                PaymentMethod = o.PaymentMethod,
                Carrier = o.Carrier,
                DeliveryType = o.DeliveryType,
                DeliveryBranch = o.DeliveryBranch,
                DeliveryCity = o.DeliveryCity,
                DeliveryCost = o.DeliveryCost,
                PromoCode = o.PromoCode,
                DiscountSum = o.DiscountSum,
                Items = o.Products.Select(p => new OrderItemDTO
                {
                    ProductId = p.ProductId,
                    ProductName = p.Product.Name,
                    Price = p.Price,
                    Quantity = p.Quantity,
                    Size = p.Size,
                    Color = p.Color,
                    ImageURL = p.Product.ImageURL
                }).ToList()
            })
            .ToListAsync();
        public async Task<Order?> GetOrderById(int id) => await _context.Orders
            .Include(o => o.Client)
            .Include(o => o.Products)
                .ThenInclude(oi => oi.Product) 
            .FirstOrDefaultAsync(o => o.Id == id);
        public async Task<string?> GetOrderStatus(int orderId)
        {
            var order = await _context.Orders
                .FirstOrDefaultAsync(o => o.Id == orderId);
            return order?.Status;
        }
        public async Task<Order?> CreateOrderFromCart([FromBody] CreateOrderDto orderDto, int clientId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var cartItems = await GetCartItems(clientId);
                if (!cartItems.Any()) return null;

                foreach (var item in cartItems)
                {
                    var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == item.ProductId);
                    bool isPreOrder = product?.IsPreOrder ?? false;

                    var stockEntry = await _context.ProductSizes
                        .FirstOrDefaultAsync(ps => ps.ProductId == item.ProductId && ps.Size == item.Size);

                    if (!isPreOrder)
                    {
                        if (stockEntry == null || stockEntry.Quantity < item.Quantity)
                        {
                            throw new Exception($"Недостатньо товару на складі: {product?.Name ?? item.ProductId.ToString()} ({item.Size})");
                        }
                        stockEntry.Quantity -= item.Quantity;
                    }
                }


                decimal totalCartSum = await GetSum(clientId);
                decimal discount = 0;
                string? appliedPromo = null;
                if (!string.IsNullOrWhiteSpace(orderDto.PromoCode))
                {
                    var cleanPromo = orderDto.PromoCode.Trim().ToUpperInvariant();
                    var promo = await _context.PromoCodes.FirstOrDefaultAsync(p => p.Code.ToUpper() == cleanPromo && p.IsActive);
                    if (promo != null && (!promo.ExpiryDate.HasValue || promo.ExpiryDate.Value >= DateTime.UtcNow))
                    {
                        if (promo.DiscountPercent > 0)
                        {
                            discount = Math.Round(totalCartSum * (promo.DiscountPercent / 100m), 0);
                        }
                        else if (promo.DiscountAmount > 0)
                        {
                            discount = Math.Min(totalCartSum, promo.DiscountAmount);
                        }
                        appliedPromo = promo.Code;
                        promo.UsageCount += 1;
                    }
                }

                decimal deliveryCost = Math.Max(0, orderDto.DeliveryCost);
                bool isCod = string.Equals(orderDto.PaymentMethod, "Cash on Delivery", StringComparison.OrdinalIgnoreCase)
                          || string.Equals(orderDto.PaymentMethod, "COD", StringComparison.OrdinalIgnoreCase)
                          || string.Equals(orderDto.PaymentMethod, "PreOrder_Deposit", StringComparison.OrdinalIgnoreCase);

                if (isCod)
                {
                    // При оплате при получении/предоплате за доставку клиент платит перевозчику сам, сумма заказа только за одежду
                    deliveryCost = 0m;
                }
                else if (string.Equals(orderDto.PaymentMethod, "WayForPay", StringComparison.OrdinalIgnoreCase) && (totalCartSum - discount) >= 2000m)
                {
                    // Бесплатная доставка от 2000 грн при полной онлайн-оплате (WayForPay)
                    deliveryCost = 0m;
                }
                decimal finalSum = Math.Max(0, totalCartSum - discount) + deliveryCost;

                var order = new Order
                {
                    ClientId = clientId,
                    DateOfIssuance = DateTime.UtcNow,
                    Status = "Draft",
                    StreetAddress = orderDto.StreetAddress,
                    PaymentMethod = orderDto.PaymentMethod,
                    FirstName = orderDto.FirstName,
                    LastName = orderDto.LastName,
                    Phone = orderDto.Phone,
                    Country = orderDto.Country,
                    ZipCode = orderDto.ZipCode,
                    Sum = finalSum,
                    Carrier = string.IsNullOrWhiteSpace(orderDto.Carrier) ? "Nova Poshta" : orderDto.Carrier,
                    DeliveryType = string.IsNullOrWhiteSpace(orderDto.DeliveryType) ? "Warehouse" : orderDto.DeliveryType,
                    DeliveryBranch = orderDto.DeliveryBranch,
                    DeliveryCity = orderDto.DeliveryCity,
                    DeliveryCost = deliveryCost,
                    PromoCode = appliedPromo,
                    DiscountSum = discount,
                    Products = cartItems.Select(ci => new OrderItem
                    {
                        ProductId = ci.ProductId,
                        Quantity = ci.Quantity,
                        Size = ci.Size,
                        Color = ci.Color ?? string.Empty,
                        Price = ci.Product.Price
                    }).ToList()
                };
                _context.Orders.Add(order);
                _context.CartItems.RemoveRange(cartItems);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return order;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                Console.WriteLine($"Ошибка при создании заказа: {ex.Message}");
                return null;
            }

        }
        public async Task<bool> DeleteOrder(int id)
        {
            var order = await _context.Orders
                .Include(o => o.Products)
                    .ThenInclude(p => p.Product)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (order == null) return false;

            // Возврат товара на склад при удалении/отмене незавершенного заказа
            if (order.Products != null)
            {
                foreach (var item in order.Products)
                {
                    if (item.Product != null && !item.Product.IsPreOrder)
                    {
                        string cleanSize = string.IsNullOrWhiteSpace(item.Size) ? "ONE SIZE" : item.Size.Trim();
                        var stock = await _context.ProductSizes
                            .FirstOrDefaultAsync(ps => ps.ProductId == item.ProductId && ps.Size.ToLower() == cleanSize.ToLower());
                        if (stock != null)
                        {
                            stock.Quantity += item.Quantity;
                        }
                    }
                }
            }

            _context.Orders.Remove(order);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<(Order? order, bool clientCreated, string? error)> CreateGuestOrderAsync(CreateGuestOrderDto dto, EmailService emailService)
        {
            if (string.IsNullOrWhiteSpace(dto.Email))
            {
                return (null, false, "Email is required");
            }

            if (dto.Items == null || !dto.Items.Any())
            {
                return (null, false, "Cart items cannot be empty");
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                string normEmail = dto.Email.Trim().ToLower();
                var client = await _context.Clients.FirstOrDefaultAsync(c => c.Email.ToLower() == normEmail);
                bool clientCreated = false;
                string? generatedPassword = null;

                if (client == null)
                {
                    generatedPassword = emailService.GenerateSecurePassword();
                    client = new Client
                    {
                        Name = $"{dto.FirstName} {dto.LastName}".Trim(),
                        Email = normEmail,
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword(generatedPassword),
                        Role = "Client",
                        AvatarUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80"
                    };
                    if (string.IsNullOrWhiteSpace(client.Name)) client.Name = normEmail.Split('@')[0];

                    _context.Clients.Add(client);
                    await _context.SaveChangesAsync();
                    clientCreated = true;
                }

                var orderItems = new List<OrderItem>();
                decimal totalSum = 0;

                foreach (var item in dto.Items)
                {
                    var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == item.ProductId);
                    if (product == null)
                    {
                        throw new Exception($"Товар с ID {item.ProductId} не найден.");
                    }

                    string cleanItemSize = string.IsNullOrWhiteSpace(item.Size) ? "ONE SIZE" : item.Size.Trim();
                    var stockEntry = await _context.ProductSizes
                        .FirstOrDefaultAsync(ps => ps.ProductId == item.ProductId && ps.Size.ToLower() == cleanItemSize.ToLower());

                    bool isPreOrder = product.IsPreOrder;

                    if (!isPreOrder)
                    {
                        var allProductSizes = await _context.ProductSizes.Where(ps => ps.ProductId == item.ProductId).ToListAsync();
                        if (allProductSizes.Any())
                        {
                            if (stockEntry == null || stockEntry.Quantity < item.Quantity)
                            {
                                throw new Exception($"Недостатньо товару '{product.Name}' розміру {cleanItemSize} на складі.");
                            }
                            stockEntry.Quantity -= item.Quantity;
                        }
                    }
                    decimal itemTotal = product.Price * item.Quantity;
                    totalSum += itemTotal;

                    orderItems.Add(new OrderItem
                    {
                        ProductId = item.ProductId,
                        Quantity = item.Quantity,
                        Size = item.Size,
                        Color = item.Color ?? string.Empty,
                        Price = product.Price
                    });
                }

                decimal discount = 0;
                string? appliedPromo = null;
                if (!string.IsNullOrWhiteSpace(dto.PromoCode))
                {
                    var cleanPromo = dto.PromoCode.Trim().ToUpperInvariant();
                    var promo = await _context.PromoCodes.FirstOrDefaultAsync(p => p.Code.ToUpper() == cleanPromo && p.IsActive);
                    if (promo != null && (!promo.ExpiryDate.HasValue || promo.ExpiryDate.Value >= DateTime.UtcNow))
                    {
                        if (promo.DiscountPercent > 0)
                        {
                            discount = Math.Round(totalSum * (promo.DiscountPercent / 100m), 0);
                        }
                        else if (promo.DiscountAmount > 0)
                        {
                            discount = Math.Min(totalSum, promo.DiscountAmount);
                        }
                        appliedPromo = promo.Code;
                        promo.UsageCount += 1;
                    }
                }

                decimal deliveryCost = Math.Max(0, dto.DeliveryCost);
                bool isCod = string.Equals(dto.PaymentMethod, "Cash on Delivery", StringComparison.OrdinalIgnoreCase)
                          || string.Equals(dto.PaymentMethod, "COD", StringComparison.OrdinalIgnoreCase)
                          || string.Equals(dto.PaymentMethod, "PreOrder_Deposit", StringComparison.OrdinalIgnoreCase);

                if (isCod)
                {
                    // При оплате при получении/предоплате доставку клиент оплачивает сам при получении, сумма заказа чисто за одежду
                    deliveryCost = 0m;
                }
                else if (string.Equals(dto.PaymentMethod, "WayForPay", StringComparison.OrdinalIgnoreCase) && (totalSum - discount) >= 2000m)
                {
                    // Бесплатная доставка от 2000 грн при полной онлайн-оплате (WayForPay)
                    deliveryCost = 0m;
                }
                decimal finalSum = Math.Max(0, totalSum - discount) + deliveryCost;

                var order = new Order
                {
                    ClientId = client.Id,
                    DateOfIssuance = DateTime.UtcNow,
                    Status = "Draft",
                    StreetAddress = dto.StreetAddress,
                    PaymentMethod = dto.PaymentMethod,
                    FirstName = dto.FirstName,
                    LastName = dto.LastName,
                    Phone = dto.Phone,
                    Country = string.IsNullOrWhiteSpace(dto.Country) ? "Ukraine" : dto.Country,
                    ZipCode = dto.ZipCode,
                    Sum = finalSum,
                    Carrier = string.IsNullOrWhiteSpace(dto.Carrier) ? "Nova Poshta" : dto.Carrier,
                    DeliveryType = string.IsNullOrWhiteSpace(dto.DeliveryType) ? "Warehouse" : dto.DeliveryType,
                    DeliveryBranch = dto.DeliveryBranch,
                    DeliveryCity = dto.DeliveryCity,
                    DeliveryCost = deliveryCost,
                    PromoCode = appliedPromo,
                    DiscountSum = discount,
                    Products = orderItems
                };

                _context.Orders.Add(order);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return (order, clientCreated, null);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                Console.WriteLine($"[ORDER ERROR]: {ex.Message}");
                return (null, false, ex.Message);
            }
        }
        
        public async Task<Order?> UpdateOrderStatus(int orderId, string newStatus)
        {
            var order = await GetOrderById(orderId);
            if (order == null) return null;

            order.Status = newStatus;

            await _context.SaveChangesAsync();
            return order;
        }
        public async Task<PagedResult<OrderDTO>> GetAllOrdersPaged(int page, int pageSize, string? statusFilter = null)
        {
            var query = _context.Orders
                .Include(o => o.Products).ThenInclude(oi => oi.Product)
                .Include(o => o.Client)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(statusFilter) && !string.Equals(statusFilter, "ALL", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(o => o.Status == statusFilter);
            }
            else
            {
                // По умолчанию скрываем черновики (Draft) и отмененные (Cancelled)
                query = query.Where(o => o.Status != "Cancelled" && o.Status != "Draft");
            }

            query = query.OrderByDescending(o => o.DateOfIssuance);

            var totalCount = await query.CountAsync();
            var orders = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(o => new OrderDTO
                {
                    Id = o.Id,
                    Date = o.DateOfIssuance,
                    Status = o.Status,
                    TotalSum = o.Sum,
                    StreetAddress = o.StreetAddress,
                    Phone = o.Phone,
                    PaymentMethod = o.PaymentMethod,
                    Carrier = o.Carrier,
                    DeliveryType = o.DeliveryType,
                    DeliveryBranch = o.DeliveryBranch,
                    DeliveryCity = o.DeliveryCity,
                    DeliveryCost = o.DeliveryCost,
                    PromoCode = o.PromoCode,
                    DiscountSum = o.DiscountSum,
                    Items = o.Products.Select(p => new OrderItemDTO
                    {
                        ProductId = p.ProductId,
                        ProductName = p.Product.Name,
                        Price = p.Price,
                        Quantity = p.Quantity,
                        Size = p.Size,
                        Color = p.Color
                    }).ToList()
                })
                .ToListAsync();

            return new PagedResult<OrderDTO> 
            { 
                Items = orders, 
                TotalCount = totalCount,
                CurrentPage = page,
                PageSize = pageSize
            };
        }
    }
}
