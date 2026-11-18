using System.Security.Cryptography;
using System.Text;
using lynchism.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace lynchism.Services
{
    public class WayForPayService
    {
        private readonly IConfiguration _config;
        private readonly MyDbContext _context;

        public WayForPayService(IConfiguration config, MyDbContext context)
        {
            _config = config;
            _context = context;
        }

        public string MerchantAccount => _config["WayForPay:MerchantAccount"] ?? "test_com_ua18";
        public string MerchantSecretKey => _config["WayForPay:MerchantSecretKey"] ?? "dc583b44fd20efd8245b1aa49f2f376fc688350d";
        public string MerchantDomainName => _config["WayForPay:MerchantDomainName"] ?? "test.com.ua";
        public string Currency => _config["WayForPay:Currency"] ?? "UAH";

        public static string ComputeHmacMd5(string data, string key)
        {
            using var hmac = new HMACMD5(Encoding.UTF8.GetBytes(key));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
            return Convert.ToHexString(hash).ToLowerInvariant();
        }

        public Dictionary<string, object> GeneratePaymentData(Order order, string baseUrl, string frontendUrl)
        {
            string orderReference = $"ORDER-{order.Id}-{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}";
            long orderDate = new DateTimeOffset(order.DateOfIssuance == default ? DateTime.UtcNow : order.DateOfIssuance).ToUnixTimeSeconds();
            
            bool isCodPrepayment = string.Equals(order.PaymentMethod, "Cash on Delivery", StringComparison.OrdinalIgnoreCase)
                                || string.Equals(order.PaymentMethod, "COD", StringComparison.OrdinalIgnoreCase)
                                || string.Equals(order.PaymentMethod, "Prepayment", StringComparison.OrdinalIgnoreCase)
                                || string.Equals(order.PaymentMethod, "PreOrder_Deposit", StringComparison.OrdinalIgnoreCase);

            bool hasPreOrder = order.Products != null && order.Products.Any(p => p.Product != null && p.Product.IsPreOrder);
            decimal preOrderSum = 0;
            if (hasPreOrder && order.Products != null)
            {
                preOrderSum = order.Products
                    .Where(p => p.Product != null && p.Product.IsPreOrder)
                    .Sum(p => p.Price * p.Quantity);
            }

            string amount;
            string currency = Currency;

            var productNames = new List<string>();
            var productCounts = new List<string>();
            var productPrices = new List<string>();

            if (isCodPrepayment)
            {
                if (hasPreOrder)
                {
                    // Для предзаказных вещей: 50% предоплата
                    decimal preOrder50 = Math.Round(preOrderSum * 0.5m, 0);
                    amount = preOrder50.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture);
                    currency = "UAH";

                    productNames.Add($"ERASERHEAD // Передзамовлення: 50% передплата (#{order.Id})");
                    productCounts.Add("1");
                    productPrices.Add(preOrder50.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture));
                }
                else
                {
                    // Для наложенного платежа: предоплата 150 грн (покрывает доставку в обе стороны)
                    amount = "150.00";
                    currency = "UAH";
                    productNames.Add($"ERASERHEAD // Накладений платіж: передплата 150 ₴ (#{order.Id})");
                    productCounts.Add("1");
                    productPrices.Add("150.00");
                }
            }
            else
            {
                amount = order.Sum.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture);

                if (order.Products != null && order.Products.Any())
                {
                    decimal itemsSum = 0;
                    foreach (var item in order.Products)
                    {
                        string name = item.Product?.Name ?? $"Archive Item #{item.ProductId}";
                        if (!string.IsNullOrWhiteSpace(item.Size)) name += $" [{item.Size}]";
                        productNames.Add(name);
                        productCounts.Add(item.Quantity.ToString());
                        productPrices.Add(item.Price.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture));
                        itemsSum += item.Price * item.Quantity;
                    }

                    if (order.DeliveryCost > 0)
                    {
                        productNames.Add($"Доставка: {order.Carrier}");
                        productCounts.Add("1");
                        productPrices.Add(order.DeliveryCost.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture));
                        itemsSum += order.DeliveryCost;
                    }

                    if (order.DiscountSum > 0)
                    {
                        // In WayForPay, all items must be positive and sum up to total amount.
                        // If discount was applied, we can consolidate into clear line items or proportional breakdown.
                    }

                    // If difference between total sum and products exists, balance it
                    if (order.Sum != itemsSum)
                    {
                        decimal diff = order.Sum - itemsSum;
                        if (diff > 0)
                        {
                            productNames.Add("Коригування / Доставка");
                            productCounts.Add("1");
                            productPrices.Add(diff.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture));
                        }
                        else
                        {
                            // If itemsSum > order.Sum (due to discount), replace with single clean order line to avoid signature mismatch
                            productNames.Clear();
                            productCounts.Clear();
                            productPrices.Clear();
                            productNames.Add($"ERASERHEAD // Замовлення #{order.Id} (зі знижкою)");
                            productCounts.Add("1");
                            productPrices.Add(amount);
                        }
                    }
                }
                else
                {
                    productNames.Add($"ERASERHEAD // ORDER #{order.Id}");
                    productCounts.Add("1");
                    productPrices.Add(amount);
                }
            }

            var signParts = new List<string>
            {
                MerchantAccount,
                MerchantDomainName,
                orderReference,
                orderDate.ToString(),
                amount,
                currency
            };
            signParts.AddRange(productNames);
            signParts.AddRange(productCounts);
            signParts.AddRange(productPrices);

            string signString = string.Join(";", signParts);
            string merchantSignature = ComputeHmacMd5(signString, MerchantSecretKey);

            string serviceUrl = $"{baseUrl.TrimEnd('/')}/Payment/wayforpay-callback";
            string returnUrl = $"{baseUrl.TrimEnd('/')}/Payment/wayforpay-return?orderId={order.Id}&front={Uri.EscapeDataString(frontendUrl)}";

            // Normalize Ukrainian phone number to international 380XXXXXXXXX
            string phone = (order.Phone ?? "").Replace("+", "").Replace(" ", "").Replace("-", "").Replace("(", "").Replace(")", "");
            if (phone.StartsWith("0") && phone.Length == 10)
            {
                phone = "38" + phone;
            }
            if (string.IsNullOrWhiteSpace(phone) || phone.Length < 10)
            {
                phone = "380990000000";
            }

            return new Dictionary<string, object>
            {
                ["merchantAccount"] = MerchantAccount,
                ["merchantAuthType"] = "SimpleSignature",
                ["authorizationType"] = "SimpleSignature",
                ["merchantDomainName"] = MerchantDomainName,
                ["merchantSignature"] = merchantSignature,
                ["orderReference"] = orderReference,
                ["orderDate"] = orderDate,
                ["amount"] = amount,
                ["currency"] = currency,
                ["productName"] = productNames,
                ["productCount"] = productCounts,
                ["productPrice"] = productPrices,
                ["clientFirstName"] = string.IsNullOrWhiteSpace(order.FirstName) ? "Customer" : order.FirstName,
                ["clientLastName"] = string.IsNullOrWhiteSpace(order.LastName) ? "Client" : order.LastName,
                ["clientEmail"] = order.Client?.Email ?? "order@eraserhead.store",
                ["clientPhone"] = phone,
                ["language"] = "UA",
                ["serviceUrl"] = serviceUrl,
                ["returnUrl"] = returnUrl
            };
        }

        public bool ValidateCallbackSignature(
            string merchantAccount,
            string orderReference,
            string amount,
            string currency,
            string authCode,
            string cardPan,
            string transactionStatus,
            string reasonCode,
            string incomingSignature)
        {
            string stringToHash = $"{merchantAccount};{orderReference};{amount};{currency};{authCode};{cardPan};{transactionStatus};{reasonCode}";
            string calculated = ComputeHmacMd5(stringToHash, MerchantSecretKey);
            return string.Equals(calculated, incomingSignature, StringComparison.OrdinalIgnoreCase);
        }

        public object CreateCallbackResponse(string orderReference)
        {
            long time = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            string responseSignature = ComputeHmacMd5($"{orderReference};accept;{time}", MerchantSecretKey);
            return new
            {
                orderReference = orderReference,
                status = "accept",
                time = time,
                signature = responseSignature
            };
        }

        public async Task<string?> CheckTransactionStatusAsync(string orderReference)
        {
            try
            {
                string signString = $"{MerchantAccount};{orderReference}";
                string sign = ComputeHmacMd5(signString, MerchantSecretKey);

                var requestBody = new
                {
                    transactionType = "CHECK_STATUS",
                    merchantAccount = MerchantAccount,
                    orderReference = orderReference,
                    merchantSignature = sign,
                    apiVersion = 1
                };

                using var client = new HttpClient();
                var jsonContent = new StringContent(System.Text.Json.JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
                var response = await client.PostAsync("https://api.wayforpay.com/api", jsonContent);
                if (!response.IsSuccessStatusCode) return null;

                var respJson = await response.Content.ReadAsStringAsync();
                using var doc = System.Text.Json.JsonDocument.Parse(respJson);
                if (doc.RootElement.TryGetProperty("transactionStatus", out var statusProp))
                {
                    return statusProp.GetString();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[WayForPay CheckStatus Error]: {ex.Message}");
            }
            return null;
        }
    }
}
