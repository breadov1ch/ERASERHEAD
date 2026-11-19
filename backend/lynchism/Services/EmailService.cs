using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Mail;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;

namespace lynchism.Services
{
    public class EmailService
    {
        private readonly IConfiguration _config;
        private static readonly HttpClient _httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(8) };

        public EmailService(IConfiguration config)
        {
            _config = config;
        }

        public string GenerateSecurePassword(int length = 10)
        {
            const string validChars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!#$*";
            var bytes = new byte[length];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(bytes);
            }

            var chars = new char[length];
            for (int i = 0; i < length; i++)
            {
                chars[i] = validChars[bytes[i] % validChars.Length];
            }
            return "ERH-" + new string(chars);
        }

        public string GenerateResetCode()
        {
            var rnd = new Random();
            return rnd.Next(100000, 999999).ToString();
        }

        public async Task<bool> SendEmailAsync(string toEmail, string subject, string htmlBody)
        {
            Console.WriteLine($"\n==================================================");
            Console.WriteLine($"[DISPATCH EMAIL TO: {toEmail}]");
            Console.WriteLine($"SUBJECT: {subject}");

            // 1. ПРИОРИТЕТ: HTTP REST API (Resend) - Работает на Render Free, Vercel, AWS без блокировок SMTP портов
            string resendApiKey = (_config["Resend:ApiKey"] ?? Environment.GetEnvironmentVariable("RESEND_API_KEY") ?? "").Trim();
            if (!string.IsNullOrWhiteSpace(resendApiKey))
            {
                Console.WriteLine($"[EMAIL RELAY]: Отправка через Resend HTTP API (Port 443)...");
                try
                {
                    using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails");
                    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", resendApiKey);
                    string from = _config["Resend:From"] ?? "ERASERHEAD <onboarding@resend.dev>";
                    var payload = new
                    {
                        from = from,
                        to = new[] { toEmail.Trim() },
                        subject = subject,
                        html = htmlBody
                    };
                    request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

                    var response = await _httpClient.SendAsync(request);
                    if (response.IsSuccessStatusCode)
                    {
                        Console.WriteLine($"[RESEND SUCCESS]: Письмо успешно отправлено через Resend API для {toEmail}!");
                        Console.WriteLine($"==================================================\n");
                        return true;
                    }
                    var errBody = await response.Content.ReadAsStringAsync();
                    Console.WriteLine($"[RESEND ERROR]: Статус {response.StatusCode}: {errBody}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[RESEND EXCEPTION]: {ex.Message}");
                }
            }

            // 2. ПРИОРИТЕТ: HTTP REST API (Brevo / Sendinblue) - Также через HTTPS Port 443
            string brevoApiKey = (_config["Brevo:ApiKey"] ?? Environment.GetEnvironmentVariable("BREVO_API_KEY") ?? "").Trim();
            if (!string.IsNullOrWhiteSpace(brevoApiKey))
            {
                Console.WriteLine($"[EMAIL RELAY]: Отправка через Brevo HTTP API (Port 443)...");
                try
                {
                    using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.brevo.com/v3/smtp/email");
                    request.Headers.Add("api-key", brevoApiKey);
                    var payload = new
                    {
                        sender = new { name = "ERASERHEAD", email = "eraserhead.store@gmail.com" },
                        to = new[] { new { email = toEmail.Trim() } },
                        subject = subject,
                        htmlContent = htmlBody
                    };
                    request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

                    var response = await _httpClient.SendAsync(request);
                    if (response.IsSuccessStatusCode)
                    {
                        Console.WriteLine($"[BREVO SUCCESS]: Письмо успешно отправлено через Brevo API для {toEmail}!");
                        Console.WriteLine($"==================================================\n");
                        return true;
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[BREVO EXCEPTION]: {ex.Message}");
                }
            }

            // 3. ПРИОРИТЕТ: Стандартный SMTP (Gmail, etc.) с повтором и таймаутом
            string smtpHost = _config["Smtp:Host"] ?? Environment.GetEnvironmentVariable("SMTP_HOST") ?? "";
            string smtpPortStr = _config["Smtp:Port"] ?? Environment.GetEnvironmentVariable("SMTP_PORT") ?? "587";
            string smtpUser = _config["Smtp:User"] ?? Environment.GetEnvironmentVariable("SMTP_USER") ?? "";
            string smtpPass = (_config["Smtp:Password"] ?? Environment.GetEnvironmentVariable("SMTP_PASSWORD") ?? "").Replace(" ", "").Trim();
            string fromEmail = _config["Smtp:From"] ?? Environment.GetEnvironmentVariable("SMTP_FROM") ?? smtpUser;
            if (string.IsNullOrWhiteSpace(fromEmail)) fromEmail = "eraserhead.store@gmail.com";

            if (!string.IsNullOrWhiteSpace(smtpHost) && !string.IsNullOrWhiteSpace(smtpUser) && !string.IsNullOrWhiteSpace(smtpPass))
            {
                int.TryParse(smtpPortStr, out int port);
                if (port <= 0) port = 587;

                // До 2 попыток отправки на случай кратковременного сбоя сокета Gmail
                for (int attempt = 1; attempt <= 2; attempt++)
                {
                    try
                    {
                        Console.WriteLine($"[SMTP RELAY (Попытка {attempt}/2)]: Отправка через {smtpHost}:{port} на {toEmail}...");

                        using var client = new SmtpClient(smtpHost, port)
                        {
                            UseDefaultCredentials = false,
                            Credentials = new NetworkCredential(smtpUser.Trim(), smtpPass.Trim()),
                            EnableSsl = true,
                            DeliveryMethod = SmtpDeliveryMethod.Network
                        };

                        var mailMessage = new MailMessage
                        {
                            From = new MailAddress(fromEmail, "ERASERHEAD"),
                            Subject = subject,
                            Body = htmlBody,
                            IsBodyHtml = true
                        };
                        mailMessage.To.Add(toEmail.Trim());
                        mailMessage.ReplyToList.Add(new MailAddress("eraserhead.store@gmail.com", "ERASERHEAD Support"));
                        mailMessage.Headers.Add("X-Priority", "1");
                        mailMessage.Headers.Add("Importance", "High");

                        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(7));
                        var sendTask = client.SendMailAsync(mailMessage);
                        var completedTask = await Task.WhenAny(sendTask, Task.Delay(7000, cts.Token));

                        if (completedTask != sendTask)
                        {
                            throw new TimeoutException($"SMTP connection timed out after 7s on attempt {attempt}.");
                        }

                        await sendTask;
                        Console.WriteLine($"[SMTP SUCCESS]: Письмо успешно отправлено для {toEmail}!");
                        Console.WriteLine($"==================================================\n");
                        return true;
                    }
                    catch (Exception ex)
                    {
                        Console.ForegroundColor = ConsoleColor.Yellow;
                        Console.WriteLine($"[SMTP ATTEMPT {attempt} FAILED]: {ex.Message}");
                        Console.ResetColor();

                        if (attempt == 1)
                        {
                            await Task.Delay(1000);
                            continue;
                        }

                        Console.ForegroundColor = ConsoleColor.Red;
                        Console.WriteLine($"[SMTP ERROR FINAL]: Не удалось отправить письмо через {smtpHost}:{port} после 2 попыток: {ex.Message}");
                        Console.ResetColor();
                        return false;
                    }
                }
            }

            return true;
        }

        public async Task<bool> SendWelcomePasswordEmailAsync(string toEmail, string password, string name)
        {
            string subject = "ERASERHEAD // ACCESS_KEY DISPATCH";
            string body = $@"
                <div style=""background-color: #070707; color: #fff; font-family: 'Courier New', Courier, monospace; padding: 40px; border: 1px solid #222; max-width: 600px; margin: 0 auto;"">
                    <div style=""border-bottom: 1px solid #333; padding-bottom: 15px; margin-bottom: 25px;"">
                        <span style=""color: #666; font-size: 10px; letter-spacing: 4px; text-transform: uppercase;"">SYSTEM_ACCESS // REGISTRATION</span>
                        <h1 style=""color: #fff; font-size: 28px; font-weight: 900; letter-spacing: 3px; margin: 5px 0 0 0;"">ERASERHEAD</h1>
                    </div>
                    <p style=""color: #aaa; font-size: 13px; line-height: 1.6;"">
                        Приветствуем, <strong style=""color: #fff;"">{name}</strong>. Ваш профиль успешно инициализирован в системе архива.
                    </p>
                    <p style=""color: #888; font-size: 12px;"">Для первого входа используйте сгенерированный системой пароль:</p>
                    <div style=""background: #111; padding: 20px; border-left: 3px solid #fff; margin: 25px 0;"">
                        <span style=""color: #666; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; display: block; margin-bottom: 5px;"">ВАШ КЛЮЧ ДОСТУПА / PASSWORD:</span>
                        <strong style=""color: #fff; font-size: 22px; letter-spacing: 3px;"">{password}</strong>
                    </div>
                    <p style=""color: #666; font-size: 11px; line-height: 1.5;"">
                        Вы можете сменить этот пароль и аватарку в любой момент в вашем личном кабинете.
                    </p>
                    <div style=""border-top: 1px solid #222; margin-top: 30px; padding-top: 15px; font-size: 9px; color: #555; letter-spacing: 2px;"">
                        © 2026 ERASERHEAD // VOID_CONTROL_SYSTEMS // DIRECT DISPATCH
                    </div>
                </div>";
            return await SendEmailAsync(toEmail, subject, body);
        }

        public async Task<bool> SendPasswordResetEmailAsync(string toEmail, string resetCode)
        {
            string subject = $"Код відновлення пароля: {resetCode} — ERASERHEAD";
            string body = $@"
                <div style=""background-color: #070707; color: #fff; font-family: 'Courier New', Courier, monospace; padding: 40px; border: 1px solid #222; max-width: 600px; margin: 0 auto;"">
                    <div style=""border-bottom: 1px solid #333; padding-bottom: 15px; margin-bottom: 25px;"">
                        <span style=""color: #666; font-size: 10px; letter-spacing: 4px; text-transform: uppercase;"">SECURITY_VERIFICATION // RECOVERY</span>
                        <h1 style=""color: #fff; font-size: 28px; font-weight: 900; letter-spacing: 3px; margin: 5px 0 0 0;"">ERASERHEAD</h1>
                    </div>
                    <p style=""color: #aaa; font-size: 13px; line-height: 1.6;"">
                        Был запрошен сброс пароля для аккаунта <strong style=""color: #fff;"">{toEmail}</strong>.
                    </p>
                    <div style=""background: #111; padding: 20px; border-left: 3px solid #fff; margin: 25px 0;"">
                        <span style=""color: #666; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; display: block; margin-bottom: 5px;"">ОДНОРАЗОВЫЙ КОД ПОДТВЕРЖДЕНИЯ:</span>
                        <strong style=""color: #fff; font-size: 32px; letter-spacing: 6px;"">{resetCode}</strong>
                    </div>
                    <p style=""color: #666; font-size: 11px; line-height: 1.5;"">
                        Код действителен в течение 15 минут. Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.
                    </p>
                    <div style=""border-top: 1px solid #222; margin-top: 30px; padding-top: 15px; font-size: 9px; color: #555; letter-spacing: 2px;"">
                        © 2026 ERASERHEAD // DNIPRO, UA // SECURE_RELAY
                    </div>
                </div>";
            return await SendEmailAsync(toEmail, subject, body);
        }

        public async Task<bool> SendOrderConfirmationAndAccountCreatedEmailAsync(string toEmail, string name, string password, int orderId, decimal sum)
        {
            string subject = $"ERASERHEAD // ORDER_CONFIRMED #{orderId} + ACCOUNT_CREATED";
            string body = $@"
                <div style=""background-color: #070707; color: #fff; font-family: 'Courier New', Courier, monospace; padding: 40px; border: 1px solid #222; max-width: 600px; margin: 0 auto;"">
                    <div style=""border-bottom: 1px solid #333; padding-bottom: 15px; margin-bottom: 25px;"">
                        <span style=""color: #666; font-size: 10px; letter-spacing: 4px; text-transform: uppercase;"">ORDER_CONFIRMATION // ARCHIVE_DISPATCH</span>
                        <h1 style=""color: #fff; font-size: 28px; font-weight: 900; letter-spacing: 3px; margin: 5px 0 0 0;"">ERASERHEAD</h1>
                    </div>
                    <p style=""color: #aaa; font-size: 13px; line-height: 1.6;"">
                        Здравствуйте, <strong style=""color: #fff;"">{name}</strong>. Ваш заказ <strong style=""color: #fff;"">#{orderId}</strong> на сумму <strong style=""color: #fff;"">${sum:F2}</strong> успешно зарегистрирован и передан на сборку.
                    </p>
                    <div style=""background: #111; padding: 20px; border-left: 3px solid #fff; margin: 25px 0;"">
                        <span style=""color: #666; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; display: block; margin-bottom: 5px;"">АВТОМАТИЧЕСКИ СОЗДАН АККАУНТ ДЛЯ ОТСЛЕЖИВАНИЯ:</span>
                        <p style=""color: #aaa; font-size: 12px; margin: 5px 0;"">Email: <strong style=""color: #fff;"">{toEmail}</strong></p>
                        <p style=""color: #aaa; font-size: 12px; margin: 5px 0;"">Сгенерированный пароль: <strong style=""color: #fff; font-size: 18px; letter-spacing: 2px;"">{password}</strong></p>
                    </div>
                    <p style=""color: #666; font-size: 11px; line-height: 1.5;"">
                        Вы можете использовать эти данные для входа в личный кабинет, отслеживания статуса посылки и истории заказов. Пароль можно изменить в любой момент в настройках профиля.
                    </p>
                    <div style=""border-top: 1px solid #222; margin-top: 30px; padding-top: 15px; font-size: 9px; color: #555; letter-spacing: 2px;"">
                        © 2026 ERASERHEAD // VOID_CONTROL_SYSTEMS // ORDER LOG
                    </div>
                </div>";
            return await SendEmailAsync(toEmail, subject, body);
        }

        public async Task<bool> SendOrderConfirmationEmailAsync(string toEmail, string name, int orderId, decimal sum)
        {
            string subject = $"ERASERHEAD // ORDER_CONFIRMED #{orderId}";
            string body = $@"
                <div style=""background-color: #070707; color: #fff; font-family: 'Courier New', Courier, monospace; padding: 40px; border: 1px solid #222; max-width: 600px; margin: 0 auto;"">
                    <div style=""border-bottom: 1px solid #333; padding-bottom: 15px; margin-bottom: 25px;"">
                        <span style=""color: #666; font-size: 10px; letter-spacing: 4px; text-transform: uppercase;"">ORDER_CONFIRMATION // ARCHIVE_DISPATCH</span>
                        <h1 style=""color: #fff; font-size: 28px; font-weight: 900; letter-spacing: 3px; margin: 5px 0 0 0;"">ERASERHEAD</h1>
                    </div>
                    <p style=""color: #aaa; font-size: 13px; line-height: 1.6;"">
                        Здравствуйте, <strong style=""color: #fff;"">{name}</strong>. Ваш заказ <strong style=""color: #fff;"">#{orderId}</strong> на сумму <strong style=""color: #fff;"">${sum:F2}</strong> успешно зарегистрирован и передан на сборку.
                    </p>
                    <p style=""color: #888; font-size: 12px; line-height: 1.5;"">
                        Вы можете отслеживать статус выполнения заказа в вашем личном кабинете.
                    </p>
                    <div style=""border-top: 1px solid #222; margin-top: 30px; padding-top: 15px; font-size: 9px; color: #555; letter-spacing: 2px;"">
                        © 2026 ERASERHEAD // VOID_CONTROL_SYSTEMS // DIRECT DISPATCH
                    </div>
                </div>";
            return await SendEmailAsync(toEmail, subject, body);
        }

        public async Task<bool> SendRegistrationCodeEmailAsync(string toEmail, string code, string name)
        {
            string subject = $"Код підтвердження: {code} — ERASERHEAD";
            string displayName = string.IsNullOrWhiteSpace(name) ? toEmail.Split('@')[0] : name;
            string body = $@"
                <div style=""background-color: #070707; color: #fff; font-family: 'Courier New', Courier, monospace; padding: 40px; border: 1px solid #222; max-width: 600px; margin: 0 auto;"">
                    <div style=""border-bottom: 1px solid #333; padding-bottom: 15px; margin-bottom: 25px;"">
                        <span style=""color: #666; font-size: 10px; letter-spacing: 4px; text-transform: uppercase;"">IDENTITY_CONFIRMATION // REGISTRATION</span>
                        <h1 style=""color: #fff; font-size: 28px; font-weight: 900; letter-spacing: 3px; margin: 5px 0 0 0;"">ERASERHEAD</h1>
                    </div>
                    <p style=""color: #aaa; font-size: 13px; line-height: 1.6;"">
                        Вітаємо, <strong style=""color: #fff;"">{displayName}</strong>. Для завершення реєстрації у системі архіва підтвердіть вашу адресу електронної пошти.
                    </p>
                    <div style=""background: #111; padding: 25px 20px; border-left: 3px solid #fff; margin: 25px 0;"">
                        <span style=""color: #666; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; display: block; margin-bottom: 8px;"">ОДНОРАЗОВИЙ КОД ПІДТВЕРДЖЕННЯ / CODE:</span>
                        <strong style=""color: #fff; font-size: 34px; letter-spacing: 8px; font-family: monospace;"">{code}</strong>
                    </div>
                    <p style=""color: #666; font-size: 11px; line-height: 1.5;"">
                        Код дійсний протягом 15 хвилин. Нікому не передавайте цей код.
                    </p>
                    <div style=""border-top: 1px solid #222; margin-top: 30px; padding-top: 15px; font-size: 9px; color: #555; letter-spacing: 2px;"">
                        © 2026 ERASERHEAD // DNIPRO, UA // SECURE_RELAY
                    </div>
                </div>";
            return await SendEmailAsync(toEmail, subject, body);
        }

        public async Task<bool> SendWelcomeEmailAsync(string toEmail, string name)
        {
            string subject = "ERASERHEAD // WELCOME TO ARCHIVE";
            string body = $@"
                <div style=""background-color: #070707; color: #fff; font-family: 'Courier New', Courier, monospace; padding: 40px; border: 1px solid #222; max-width: 600px; margin: 0 auto;"">
                    <div style=""border-bottom: 1px solid #333; padding-bottom: 15px; margin-bottom: 25px;"">
                        <span style=""color: #666; font-size: 10px; letter-spacing: 4px; text-transform: uppercase;"">SYSTEM_INITIALIZED // ARCHIVE_MEMBER</span>
                        <h1 style=""color: #fff; font-size: 28px; font-weight: 900; letter-spacing: 3px; margin: 5px 0 0 0;"">ERASERHEAD</h1>
                    </div>
                    <p style=""color: #aaa; font-size: 13px; line-height: 1.6;"">
                        Приветствуем, <strong style=""color: #fff;"">{name}</strong>. Ваш аккаунт успешно создан.
                    </p>
                    <p style=""color: #888; font-size: 12px; line-height: 1.5;"">
                        Вы можете сохранять избранные дропы, настраивать аватарку и оформлять заказы с приоритетной доставкой.
                    </p>
                    <div style=""border-top: 1px solid #222; margin-top: 30px; padding-top: 15px; font-size: 9px; color: #555; letter-spacing: 2px;"">
                        © 2026 ERASERHEAD // VOID_CONTROL_SYSTEMS // DIRECT DISPATCH
                    </div>
                </div>";
            return await SendEmailAsync(toEmail, subject, body);
        }
    }
}
