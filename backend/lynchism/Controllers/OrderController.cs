using lynchism.Models;
using lynchism.Services;
using lynchism.DTO;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace lynchism.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class OrderController: Controller
    {
        private readonly OrderService _orderService;
        private readonly EmailService _emailService;

        public OrderController(OrderService orderService, EmailService emailService) {
            _orderService = orderService;
            _emailService = emailService;
        }

        [AllowAnonymous]
        [HttpPost("guest_checkout")]
        [HttpPost("checkout")]
        public async Task<ActionResult> GuestCheckout([FromBody] CreateGuestOrderDto dto)
        {
            var (order, clientCreated, error) = await _orderService.CreateGuestOrderAsync(dto, _emailService);
            if (order == null)
            {
                return BadRequest(new { message = error ?? "Failed to create order" });
            }

            return Ok(new 
            { 
                orderId = order.Id,
                clientCreated = clientCreated,
                email = dto.Email,
                sum = order.Sum,
                message = clientCreated 
                    ? "Order confirmed! An account was created and your access key was dispatched to your email."
                    : "Order confirmed! Confirmation was dispatched to your email."
            });
        }

        [AllowAnonymous]
        [HttpGet("getOrderStatus/{orderId}")]
        public async Task<ActionResult> GetOrderStatusPublic(int orderId)
        {
            var order = await _orderService.GetOrderByOrderId(orderId);

            if (order == null)
            {
                return NotFound(new { message = $"Заказ #{orderId} не найден" });
            }

            bool hasPreOrder = order.Products != null && order.Products.Any(p => p.Product != null && p.Product.IsPreOrder);
            decimal preOrderSum = 0;
            if (hasPreOrder && order.Products != null)
            {
                preOrderSum = order.Products
                    .Where(p => p.Product != null && p.Product.IsPreOrder)
                    .Sum(p => p.Price * p.Quantity);
            }
            decimal preOrderDeposit = Math.Round(preOrderSum * 0.5m, 0);
            decimal requiredDeposit = hasPreOrder ? preOrderDeposit : 150m;
            decimal dueOnDelivery = order.Status == "Paid" ? 0 : Math.Max(0, order.Sum - requiredDeposit);

            return Ok(new
            {
                orderId = order.Id,
                status = order.Status,
                paymentMethod = order.PaymentMethod,
                sum = order.Sum,
                firstName = order.FirstName,
                lastName = order.LastName,
                hasPreOrder = hasPreOrder,
                preOrderSum = preOrderSum,
                preOrderDeposit = preOrderDeposit,
                requiredDeposit = requiredDeposit,
                dueOnDelivery = dueOnDelivery,
                carrier = order.Carrier,
                deliveryType = order.DeliveryType,
                deliveryBranch = order.DeliveryBranch,
                deliveryCity = order.DeliveryCity,
                deliveryCost = order.DeliveryCost,
                promoCode = order.PromoCode,
                discountSum = order.DiscountSum
            });
        }

        [AllowAnonymous]
        [HttpDelete("cancel-pending/{orderId}")]
        public async Task<ActionResult> CancelPendingOrder(int orderId)
        {
            var order = await _orderService.GetOrderByOrderId(orderId);
            if (order == null) return NotFound("Замовлення не знайдено");

            if (order.Status == "Pending" || order.Status == "Awaiting_Payment" || order.Status == "Draft")
            {
                bool deleted = await _orderService.DeleteOrder(orderId);
                return Ok(new { cancelled = deleted, orderId });
            }

            return BadRequest(new { message = "Оплачене замовлення не може бути скасоване через цей запит" });
        }

        [Authorize]
        [HttpGet("getOrders")]
        public async Task<ActionResult<List<OrderDTO>>> GetOrders()
        {
            var nameIdentifier = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(nameIdentifier) || !int.TryParse(nameIdentifier, out int id))
            {
                return Unauthorized("Не удалось идентифицировать пользователя.");
            }
            List<OrderDTO> finded_orders = await _orderService.GetOrderByClientId(id);
            if (finded_orders == null || !finded_orders.Any())
                return NotFound("You dont have orders yet");
            return Ok(finded_orders);
        }

        [Authorize(Roles = "Admin,Staff,Manager")]
        [HttpGet("getAllOrders")]
        public async Task<ActionResult<PagedResult<OrderDTO>>> GetAllOrders([FromQuery] int page = 1, [FromQuery] int pageSize = 10, [FromQuery] string? status = null)
        {
            var allOrders = await _orderService.GetAllOrdersPaged(page, pageSize, status);
            if (allOrders == null || !allOrders.Items.Any())
            {
                return NotFound("В системе пока нет ни одного заказа.");
            }
            return Ok(allOrders);
        }

        [Authorize]
        [HttpGet("getOrder/{orderId}")]
        public async Task<ActionResult<Order>> GetOrder(int orderId)
        {
            var nameIdentifier = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(nameIdentifier) || !int.TryParse(nameIdentifier, out int id))
            {
                return Unauthorized("Не удалось идентифицировать пользователя.");
            }
            Order? finded_order = await _orderService.GetOrder(orderId, id);
            if (finded_order == null)
                return NotFound("");
            return Ok(finded_order);
        }

        [Authorize(Roles = "Admin,Staff,Manager")]
        [HttpGet("getOrderById/{orderId}")]
        public async Task<ActionResult<Order>> GetOrderById(int orderId)
        {
            Order? finded_order = await _orderService.GetOrderByOrderId(orderId);
            if (finded_order == null)
                return NotFound("");
            return Ok(finded_order);
        }

        [Authorize]
        [HttpPost("create_order")]
        public async Task<ActionResult<Order>> CreateOrder([FromBody] CreateOrderDto orderDto)
        {
            var nameIdentifier = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(nameIdentifier) || !int.TryParse(nameIdentifier, out int id))
            {
                return Unauthorized("Не удалось идентифицировать пользователя.");
            }
            Order? currentOrder = await _orderService.CreateOrderFromCart(orderDto, id);
            if (currentOrder != null) return currentOrder;
            return BadRequest("Error with attempt to create order");
        }

        [Authorize(Roles = "Admin,Staff,Manager")]
        [HttpPost("update_status")]
        [HttpPut("update_status")]
        public async Task<ActionResult> UpdateStatus([FromQuery] int orderId, [FromQuery] string? status)
        {
            if (!string.IsNullOrWhiteSpace(status))
            {
                var updated = await _orderService.UpdateOrderStatus(orderId, status);
                if (updated == null) return BadRequest("Order was not found");
                return Ok(updated);
            }

            string? currentStatus = await _orderService.GetOrderStatus(orderId);
            if (currentStatus == null) return BadRequest("Order wasnt found");
            if (currentStatus == "Pending") return Ok(await _orderService.UpdateOrderStatus(orderId, "Shipped"));
            return Ok(await _orderService.UpdateOrderStatus(orderId, "Completed"));
        }

        // Прямой роут для совместимости с админкой
        [Authorize(Roles = "Admin,Staff,Manager")]
        [HttpPut("/Admin/update-status")]
        public async Task<ActionResult> AdminUpdateStatus([FromQuery] int id, [FromQuery] string status)
        {
            var updated = await _orderService.UpdateOrderStatus(id, status);
            if (updated == null) return BadRequest("Order was not found");
            return Ok(updated);
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("delete_order")]
        public async Task<ActionResult> DeleteOrder(int orderId)
        {
            bool result = await _orderService.DeleteOrder(orderId);
            if (!result) return BadRequest("Error with delete order");
            return Ok($"Order with id[{orderId}] has been deleted");
        }
    }
}
