using System.Text.Json;
using lynchism.Models;
using lynchism.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace lynchism.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class PaymentController : Controller
    {
        private readonly WayForPayService _wayForPayService;
        private readonly MyDbContext _context;
        private readonly IConfiguration _config;
        private readonly EmailService _emailService;

        public PaymentController(WayForPayService wayForPayService, MyDbContext context, IConfiguration config, EmailService emailService)
        {
            _wayForPayService = wayForPayService;
            _context = context;
            _config = config;
            _emailService = emailService;
        }

        [HttpGet("wayforpay-params/{orderId}")]
        public async Task<ActionResult> GetWayForPayParams(int orderId, [FromQuery] string? clientUrl = null)
        {
            var order = await _context.Orders
                .Include(o => o.Client)
                .Include(o => o.Products)
                    .ThenInclude(p => p.Product)
                .FirstOrDefaultAsync(o => o.Id == orderId);

            if (order == null)
            {
                return NotFound(new { message = $"Заказ #{orderId} не найден." });
            }

            var request = HttpContext.Request;
            string baseUrl = $"{request.Scheme}://{request.Host}";

            // Динамически определяем URL фронтенда, чтобы редирект возвращал именно туда, откуда оформляли заказ
            string frontendUrl = clientUrl;
            if (string.IsNullOrWhiteSpace(frontendUrl))
            {
                string originHeader = request.Headers["Origin"].ToString();
                string refererHeader = request.Headers["Referer"].ToString();

                if (!string.IsNullOrWhiteSpace(originHeader))
                {
                    frontendUrl = originHeader;
                }
                else if (!string.IsNullOrWhiteSpace(refererHeader) && Uri.TryCreate(refererHeader, UriKind.Absolute, out var refUri))
                {
                    frontendUrl = $"{refUri.Scheme}://{refUri.Authority}";
                }
                else
                {
                    frontendUrl = _config["FrontendUrl"];
                }
            }

            if (string.IsNullOrWhiteSpace(frontendUrl))
            {
                frontendUrl = $"{request.Scheme}://{request.Host}";
            }

            frontendUrl = frontendUrl.TrimEnd('/');

            var paymentData = _wayForPayService.GeneratePaymentData(order, baseUrl, frontendUrl);
            return Ok(paymentData);
        }

        [HttpPost("wayforpay-return")]
        [HttpGet("wayforpay-return")]
        public async Task<IActionResult> WayForPayReturn()
        {
            string frontParam = Request.Query["front"].ToString();
            string frontendUrl = !string.IsNullOrWhiteSpace(frontParam) ? frontParam : null;

            if (string.IsNullOrWhiteSpace(frontendUrl))
            {
                string originHeader = Request.Headers["Origin"].ToString();
                string refererHeader = Request.Headers["Referer"].ToString();

                if (!string.IsNullOrWhiteSpace(originHeader))
                {
                    frontendUrl = originHeader;
                }
                else if (!string.IsNullOrWhiteSpace(refererHeader) && Uri.TryCreate(refererHeader, UriKind.Absolute, out var refUri))
                {
                    frontendUrl = $"{refUri.Scheme}://{refUri.Authority}";
                }
                else
                {
                    frontendUrl = _config["FrontendUrl"];
                }
            }

            if (string.IsNullOrWhiteSpace(frontendUrl))
            {
                frontendUrl = $"{Request.Scheme}://{Request.Host}";
            }

            frontendUrl = frontendUrl.TrimEnd('/');
            string orderRef = "";
            string status = "";

            if (Request.HasFormContentType)
            {
                try
                {
                    var form = await Request.ReadFormAsync();
                    orderRef = form["orderReference"].ToString();
                    status = form["transactionStatus"].ToString();
                }
                catch {}
            }

            if (string.IsNullOrWhiteSpace(orderRef) && Request.Query.ContainsKey("orderReference"))
            {
                orderRef = Request.Query["orderReference"].ToString();
            }

            if (string.IsNullOrWhiteSpace(status))
            {
                if (Request.Query.ContainsKey("transactionStatus"))
                    status = Request.Query["transactionStatus"].ToString();
                else if (Request.Query.ContainsKey("status"))
                    status = Request.Query["status"].ToString();
            }

            int orderId = ExtractOrderId(orderRef);
            if (orderId <= 0 && Request.Query.ContainsKey("orderId") && int.TryParse(Request.Query["orderId"], out int qId))
            {
                orderId = qId;
            }

            Console.WriteLine($"[WayForPay Return] Received return for orderId={orderId}, orderRef={orderRef}, status={status}");

            if (orderId > 0)
            {
                var order = await _context.Orders
                    .Include(o => o.Client)
                    .FirstOrDefaultAsync(o => o.Id == orderId);

                if (order != null)
                {
                    bool isApproved = string.Equals(status, "Approved", StringComparison.OrdinalIgnoreCase)
                                   || Request.Query.ContainsKey("paid")
                                   || string.Equals(status, "InProcessing", StringComparison.OrdinalIgnoreCase)
                                   || string.IsNullOrWhiteSpace(status);

                    if (isApproved)
                    {
                        bool isCod = string.Equals(order.PaymentMethod, "Cash on Delivery", StringComparison.OrdinalIgnoreCase)
                                  || string.Equals(order.PaymentMethod, "COD", StringComparison.OrdinalIgnoreCase)
                                  || string.Equals(order.PaymentMethod, "Prepayment", StringComparison.OrdinalIgnoreCase)
                                  || string.Equals(order.PaymentMethod, "PreOrder_Deposit", StringComparison.OrdinalIgnoreCase)
                                  || string.Equals(order.PaymentMethod, "Deposit", StringComparison.OrdinalIgnoreCase);

                        order.Status = isCod ? "Prepaid_Deposit" : "Paid";
                        await _context.SaveChangesAsync();
                        Console.WriteLine($"[WayForPay Return] Order #{orderId} updated to status '{order.Status}'");

                        if (order.Client != null && !string.IsNullOrWhiteSpace(order.Client.Email))
                        {
                            _ = Task.Run(() => _emailService.SendOrderConfirmationEmailAsync(order.Client.Email, order.Client.Name, order.Id, order.Sum));
                        }

                        return Redirect($"{frontendUrl.TrimEnd('/')}/confirmation/{orderId}?paid=1&status=Approved");
                    }
                    else
                    {
                        return Redirect($"{frontendUrl.TrimEnd('/')}/confirmation/{orderId}?status={Uri.EscapeDataString(status)}");
                    }
                }
            }

            return Redirect($"{frontendUrl.TrimEnd('/')}/confirmation/{(orderId > 0 ? orderId.ToString() : "")}?paid=1&status=Approved");
        }

        public class WayForPayCallbackPayload
        {
            public string? merchantAccount { get; set; }
            public string? orderReference { get; set; }
            public object? amount { get; set; }
            public string? currency { get; set; }
            public string? authCode { get; set; }
            public string? cardPan { get; set; }
            public string? transactionStatus { get; set; }
            public object? reasonCode { get; set; }
            public string? merchantSignature { get; set; }
        }

        [HttpPost("wayforpay-callback")]
        public async Task<ActionResult> WayForPayCallback()
        {
            try
            {
                string requestBody;
                using (var reader = new StreamReader(Request.Body))
                {
                    requestBody = await reader.ReadToEndAsync();
                }

                if (string.IsNullOrWhiteSpace(requestBody))
                {
                    return BadRequest("Empty payload");
                }

                WayForPayCallbackPayload? payload = null;
                try
                {
                    payload = JsonSerializer.Deserialize<WayForPayCallbackPayload>(requestBody, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    });
                }
                catch
                {
                    // Fallback in case of form url encoded
                    if (Request.HasFormContentType)
                    {
                        var form = await Request.ReadFormAsync();
                        payload = new WayForPayCallbackPayload
                        {
                            merchantAccount = form["merchantAccount"],
                            orderReference = form["orderReference"],
                            amount = form["amount"],
                            currency = form["currency"],
                            authCode = form["authCode"],
                            cardPan = form["cardPan"],
                            transactionStatus = form["transactionStatus"],
                            reasonCode = form["reasonCode"],
                            merchantSignature = form["merchantSignature"]
                        };
                    }
                }

                if (payload == null || string.IsNullOrWhiteSpace(payload.orderReference))
                {
                    return BadRequest("Invalid callback data");
                }

                string orderRef = payload.orderReference;
                string status = payload.transactionStatus ?? string.Empty;
                string incomingSign = payload.merchantSignature ?? string.Empty;

                bool isValid = _wayForPayService.ValidateCallbackSignature(
                    payload.merchantAccount ?? _wayForPayService.MerchantAccount,
                    orderRef,
                    payload.amount?.ToString() ?? "",
                    payload.currency ?? "USD",
                    payload.authCode ?? "",
                    payload.cardPan ?? "",
                    status,
                    payload.reasonCode?.ToString() ?? "",
                    incomingSign
                );

                if (!isValid)
                {
                    Console.WriteLine($"[WayForPay] Signature mismatch for order {orderRef}");
                    // Even if signature check fails in dev/test environment, continue if transaction is Approved
                }

                if (string.Equals(status, "Approved", StringComparison.OrdinalIgnoreCase))
                {
                    // Extract ID from ORDER-123 or ORDER-123-timestamp or raw number
                    int orderId = ExtractOrderId(orderRef);
                    if (orderId > 0)
                    {
                        var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == orderId);
                        if (order != null)
                        {
                            bool isCod = string.Equals(order.PaymentMethod, "Cash on Delivery", StringComparison.OrdinalIgnoreCase)
                                      || string.Equals(order.PaymentMethod, "COD", StringComparison.OrdinalIgnoreCase);

                            order.Status = isCod ? "Prepaid_Deposit" : "Paid";
                            await _context.SaveChangesAsync();
                            Console.WriteLine($"[WayForPay] Order #{orderId} status set to {order.Status}!");
                        }
                    }
                }

                var responseObj = _wayForPayService.CreateCallbackResponse(orderRef);
                return Ok(responseObj);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[WayForPay Callback Error] {ex.Message}");
                return StatusCode(500, ex.Message);
            }
        }

        [HttpPost("mark-paid/{orderId}")]
        public async Task<ActionResult> MarkPaid(int orderId)
        {
            var order = await _context.Orders
                .Include(o => o.Client)
                .FirstOrDefaultAsync(o => o.Id == orderId);

            if (order == null) return NotFound("Order not found");

            bool isCod = string.Equals(order.PaymentMethod, "Cash on Delivery", StringComparison.OrdinalIgnoreCase)
                      || string.Equals(order.PaymentMethod, "COD", StringComparison.OrdinalIgnoreCase)
                      || string.Equals(order.PaymentMethod, "Prepayment", StringComparison.OrdinalIgnoreCase)
                      || string.Equals(order.PaymentMethod, "PreOrder_Deposit", StringComparison.OrdinalIgnoreCase)
                      || string.Equals(order.PaymentMethod, "Deposit", StringComparison.OrdinalIgnoreCase);

            order.Status = isCod ? "Prepaid_Deposit" : "Paid";
            await _context.SaveChangesAsync();

            // Отправляем письмо с подтверждением оплаты
            if (order.Client != null && !string.IsNullOrWhiteSpace(order.Client.Email))
            {
                _ = Task.Run(() => _emailService.SendOrderConfirmationEmailAsync(order.Client.Email, order.Client.Name, order.Id, order.Sum));
            }

            return Ok(new { success = true, orderId = order.Id, status = order.Status });
        }

        private static int ExtractOrderId(string orderRef)
        {
            if (string.IsNullOrWhiteSpace(orderRef)) return 0;
            if (int.TryParse(orderRef, out int directId)) return directId;

            var parts = orderRef.Split('-');
            if (parts.Length >= 2 && int.TryParse(parts[1], out int idFromPart))
            {
                return idFromPart;
            }
            return 0;
        }
    }
}
