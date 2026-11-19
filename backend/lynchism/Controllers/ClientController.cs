using lynchism.DTO;
using lynchism.Models;
using lynchism.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace lynchism.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class ClientController : Controller
    {
        private readonly ClientService _clientService;
        private readonly TokenService _tokenService;
        private readonly EmailService _emailService;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _config;

        public ClientController(
            ClientService clientService, 
            TokenService tokenService,
            EmailService emailService,
            IHttpClientFactory httpClientFactory,
            IConfiguration config)
        {
            _clientService = clientService;
            _tokenService = tokenService;
            _emailService = emailService;
            _httpClientFactory = httpClientFactory;
            _config = config;
        }

        [Authorize(Roles = "Admin")]
        [HttpGet("clients")]
        public async Task<ActionResult<List<ClientDTO>>> GetClients()
        {
            var clients = await _clientService.GetAll(); 
            var safeList = clients.Select(c => new ClientDTO
            {
                Id = c.Id,
                Name = c.Name,
                Email = c.Email,
                Role = c.Role,
                AvatarUrl = c.AvatarUrl ?? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80"
            }).ToList();
            return Ok(safeList);
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("update-role")]
        public async Task<ActionResult> UpdateRole([FromBody] UpdateRoleDTO dto)
        {
            var client = await _clientService.GetClientById(dto.ClientId);
            if (client == null) return NotFound("User not found");

            client.Role = dto.Role;
            await _clientService.UpdateClient(client);
            return Ok(new ClientDTO 
            { 
                Id = client.Id, 
                Name = client.Name, 
                Email = client.Email, 
                Role = client.Role,
                AvatarUrl = client.AvatarUrl
            });
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("create-staff")]
        public async Task<ActionResult> CreateStaff([FromBody] CreateStaffDTO dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
                return BadRequest("Email and password are required");

            var existing = await _clientService.GetClientByEmail(dto.Email);
            if (existing != null) return BadRequest("Email is already registered");

            var newStaff = new Client
            {
                Name = dto.Name,
                Email = dto.Email.Trim().ToLower(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Role = string.IsNullOrWhiteSpace(dto.Role) ? "Staff" : dto.Role
            };

            var created = await _clientService.AddClient(newStaff);
            return Ok(new ClientDTO 
            { 
                Id = created.Id, 
                Name = created.Name, 
                Email = created.Email, 
                Role = created.Role,
                AvatarUrl = created.AvatarUrl
            });
        }

        [Authorize(Roles = "Admin")]
        [HttpGet("{id}")]
        public async Task<ActionResult> GetClientById(int id)
        {
            Client? client = await _clientService.GetClientById(id);
            if (client == null) return NotFound("Client was not found");
            return Ok(new ClientDTO 
            { 
                Id = client.Id, 
                Name = client.Name, 
                Email = client.Email, 
                Role = client.Role,
                AvatarUrl = client.AvatarUrl
            });
        }

        [Authorize]
        [HttpGet("me")]
        public async Task<ActionResult> GetMe()
        {
            var nameIdentifier = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(nameIdentifier) || !int.TryParse(nameIdentifier, out int id))
            {
                return Unauthorized("Unable to identify user session.");
            }
            var user = await _clientService.GetClientById(id);
            if (user == null)
            {
                return NotFound("User record not found.");
            }
            return Ok(new ClientDTO 
            { 
                Id = user.Id, 
                Name = user.Name, 
                Email = user.Email, 
                Role = user.Role,
                AvatarUrl = user.AvatarUrl ?? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80"
            });
        }

        [Authorize]
        [HttpPut("update-profile")]
        public async Task<ActionResult> UpdateProfile([FromBody] UpdateProfileDTO dto)
        {
            var nameIdentifier = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(nameIdentifier) || !int.TryParse(nameIdentifier, out int id))
            {
                return Unauthorized("Unauthorized");
            }

            var success = await _clientService.UpdateProfile(id, dto.Name, dto.AvatarUrl);
            if (!success) return BadRequest("Could not update profile");

            var updated = await _clientService.GetClientById(id);
            return Ok(new ClientDTO
            {
                Id = updated.Id,
                Name = updated.Name,
                Email = updated.Email,
                Role = updated.Role,
                AvatarUrl = updated.AvatarUrl
            });
        }

        [Authorize]
        [HttpPut("change-password")]
        public async Task<ActionResult> ChangePassword([FromBody] ChangePasswordDTO dto)
        {
            var nameIdentifier = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(nameIdentifier) || !int.TryParse(nameIdentifier, out int id))
            {
                return Unauthorized("Unauthorized");
            }

            var (success, error) = await _clientService.ChangePassword(id, dto.OldPassword, dto.NewPassword);
            if (!success) return BadRequest(new { message = error });

            return Ok(new { message = "Password updated successfully" });
        }

        // РЕГИСТРАЦИЯ: ШАГ 1 - Запрос 6-значного кода подтверждения на почту
        [HttpPost("send-register-code")]
        public async Task<ActionResult> SendRegisterCode([FromBody] SendRegisterCodeDTO dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Email))
            {
                return BadRequest("Email is required");
            }

            var existing = await _clientService.GetClientByEmail(dto.Email);
            if (existing != null)
            {
                return BadRequest("Акаунт з такою адресою електронної пошти вже зареєстровано.");
            }

            string clientName = string.IsNullOrWhiteSpace(dto.Name)
                ? dto.Email.Split('@')[0]
                : dto.Name.Trim();

            string passwordToSave;
            if (!string.IsNullOrWhiteSpace(dto.Password))
            {
                if (dto.Password.Trim().Length < 6)
                {
                    return BadRequest("Пароль повинен містити щонайменше 6 символів");
                }
                passwordToSave = dto.Password.Trim();
            }
            else
            {
                passwordToSave = _emailService.GenerateSecurePassword();
            }

            string code = _emailService.GenerateResetCode();
            string hash = BCrypt.Net.BCrypt.HashPassword(passwordToSave);

            _clientService.SavePendingRegistration(dto.Email, clientName, hash, code);
            await _emailService.SendRegistrationCodeEmailAsync(dto.Email, code, clientName);

            return Ok(new 
            { 
                message = "Код підтвердження надіслано на вашу пошту.",
                email = dto.Email.Trim().ToLower()
            });
        }

        // РЕГИСТРАЦИЯ: ШАГ 2 - Подтверждение 6-значного кода и автоматический вход
        [HttpPost("verify-register-code")]
        public async Task<ActionResult> VerifyRegisterCode([FromBody] VerifyRegisterCodeDTO dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Code))
            {
                return BadRequest("Email та код підтвердження обов'язкові.");
            }

            var pending = _clientService.GetPendingRegistration(dto.Email);
            if (pending == null)
            {
                return BadRequest("Код підтвердження застарів або недійсний. Будь ласка, запросіть новий код.");
            }

            if (pending.Attempts >= 5)
            {
                _clientService.RemovePendingRegistration(dto.Email);
                return BadRequest("Забагато невірних спроб. Будь ласка, запросіть новий код.");
            }

            if (pending.Code != dto.Code.Trim())
            {
                pending.Attempts++;
                return BadRequest("Невірний код підтвердження. Перевірте цифри з листа.");
            }

            // Код верный! Создаем клиента
            var newClient = new Client
            {
                Name = pending.Name,
                Email = pending.Email,
                PasswordHash = pending.PasswordHash,
                Role = pending.Name.ToLower() == "ilovebread" ? "Admin" : "Client",
                AvatarUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80"
            };

            await _clientService.AddClient(newClient);
            _clientService.RemovePendingRegistration(dto.Email);

            // Создаем токены для мгновенного входа
            var token = _tokenService.GenerateToken(newClient);
            var refreshToken = _tokenService.GenerateRefreshToken();
            newClient.RefreshToken = refreshToken;
            newClient.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(90);
            await _clientService.UpdateUserTokens(newClient);

            // Приветственное письмо
            _ = Task.Run(() => _emailService.SendWelcomeEmailAsync(newClient.Email, newClient.Name));

            return Ok(new 
            { 
                accessToken = token, 
                refreshToken = refreshToken,
                user = new ClientDTO
                {
                    Id = newClient.Id,
                    Name = newClient.Name,
                    Email = newClient.Email,
                    Role = newClient.Role,
                    AvatarUrl = newClient.AvatarUrl
                },
                message = "Реєстрація успішна! Ласкаво просимо до ERASERHEAD."
            });
        }

        // РЕГИСТРАЦИЯ: строгая двухэтапная верификация через код на почту (прямое создание без кода запрещено)
        [HttpPost("register")]
        public async Task<ActionResult> Register([FromBody] RegisterRequestDTO dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Email))
            {
                return BadRequest("Email is required");
            }

            // Перенаправляем на отправку 6-значного кода подтверждения
            return await SendRegisterCode(new SendRegisterCodeDTO
            {
                Email = dto.Email,
                Name = dto.Name,
                Password = dto.Password
            });
        }

        // ВОССТАНОВЛЕНИЕ ПАРОЛЯ: ШАГ 1 - Запрос кода на email
        [HttpPost("forgot-password")]
        public async Task<ActionResult> ForgotPassword([FromBody] ForgotPasswordDTO dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Email))
            {
                return BadRequest("Email is required");
            }

            var client = await _clientService.GetClientByEmail(dto.Email);
            if (client == null)
            {
                // Для безопасности сообщаем то же самое
                return Ok(new { message = "If the account exists, a recovery code has been dispatched." });
            }

            string code = _emailService.GenerateResetCode();
            await _clientService.SetResetCode(dto.Email, code);
            await _emailService.SendPasswordResetEmailAsync(dto.Email, code);

            return Ok(new 
            { 
                message = "Verification recovery code dispatched to your email address.",
                email = dto.Email
            });
        }

        // ВОССТАНОВЛЕНИЕ ПАРОЛЯ: ШАГ 2 - Подтверждение кода и установка нового пароля
        [HttpPost("reset-password")]
        public async Task<ActionResult> ResetPassword([FromBody] ResetPasswordDTO dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Code) || string.IsNullOrWhiteSpace(dto.NewPassword))
            {
                return BadRequest("Email, code and new password are required.");
            }

            var (success, error) = await _clientService.ResetPasswordWithCode(dto.Email, dto.Code, dto.NewPassword);
            if (!success)
            {
                return BadRequest(error);
            }

            return Ok(new { message = "Password reset successfully. You can now log in with your new access key." });
        }

        [HttpPost("login")]
        public async Task<ActionResult> LoginClient(ClientLoginDTO credentials)
        {
            var client = await _clientService.ValidateUser(credentials);
            if (client == null) return Unauthorized("Invalid email or password");

            var newToken = _tokenService.GenerateToken(client);
            var newRefreshToken = _tokenService.GenerateRefreshToken();

            client.RefreshToken = newRefreshToken;
            client.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(90);

            if (!await _clientService.UpdateUserTokens(client))
            {
                return BadRequest("Error updating user tokens");
            }

            return Ok(new TokensDTO { AccessToken = newToken, RefreshToken = newRefreshToken });
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("delete/{id}")]
        public async Task<ActionResult> Delete(int id)
        {
            if (await _clientService.DeleteClient(id)) return Ok();
            else return BadRequest("Client was not deleted");
        }

        [AllowAnonymous]
        [HttpPost("google-login")]
        public async Task<ActionResult> GoogleLogin([FromBody] GoogleLoginDTO dto)
        {
            if (string.IsNullOrWhiteSpace(dto?.IdToken))
            {
                return BadRequest(new { message = "IdToken is required." });
            }

            try
            {
                var client = _httpClientFactory.CreateClient();
                var tokenInfoUrl = $"https://oauth2.googleapis.com/tokeninfo?id_token={Uri.EscapeDataString(dto.IdToken)}";
                var response = await client.GetAsync(tokenInfoUrl);

                if (!response.IsSuccessStatusCode)
                {
                    return Unauthorized(new { message = "Invalid Google ID token." });
                }

                var jsonString = await response.Content.ReadAsStringAsync();
                using var doc = System.Text.Json.JsonDocument.Parse(jsonString);
                var root = doc.RootElement;

                // Validate audience
                string expectedClientId = _config["Google:ClientId"];
                if (string.IsNullOrWhiteSpace(expectedClientId) || expectedClientId.StartsWith("YOUR_"))
                {
                    expectedClientId = Environment.GetEnvironmentVariable("GOOGLE_CLIENT_ID") ?? "591447045837-afqvj278tr1k82gr97qhk4jr6ilkb1t2.apps.googleusercontent.com";
                }
                string aud = root.TryGetProperty("aud", out var audProp) ? audProp.GetString() ?? "" : "";

                if (!string.Equals(aud, expectedClientId, StringComparison.OrdinalIgnoreCase))
                {
                    Console.WriteLine($"[GoogleLogin] Audience mismatch: expected '{expectedClientId}', got '{aud}'");
                    return Unauthorized(new { message = "Google token audience mismatch." });
                }

                string email = root.TryGetProperty("email", out var emailProp) ? emailProp.GetString() ?? "" : "";
                if (string.IsNullOrWhiteSpace(email))
                {
                    return BadRequest(new { message = "Email could not be verified from Google." });
                }

                string name = root.TryGetProperty("name", out var nameProp) ? nameProp.GetString() ?? "" : "";
                string picture = root.TryGetProperty("picture", out var picProp) ? picProp.GetString() ?? "" : "";

                if (string.IsNullOrWhiteSpace(name))
                {
                    name = email.Split('@')[0];
                }

                var existingUser = await _clientService.GetClientByEmail(email);
                Client user;

                if (existingUser != null)
                {
                    user = existingUser;
                    bool updated = false;
                    if (string.IsNullOrWhiteSpace(user.Name) && !string.IsNullOrWhiteSpace(name))
                    {
                        user.Name = name;
                        updated = true;
                    }
                    if (string.IsNullOrWhiteSpace(user.AvatarUrl) && !string.IsNullOrWhiteSpace(picture))
                    {
                        user.AvatarUrl = picture;
                        updated = true;
                    }
                    if (updated)
                    {
                        await _clientService.UpdateUserTokens(user);
                    }
                }
                else
                {
                    user = new Client
                    {
                        Name = name,
                        Email = email,
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N")),
                        Role = "Client",
                        AvatarUrl = !string.IsNullOrWhiteSpace(picture) ? picture : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80"
                    };
                    await _clientService.AddClient(user);
                }

                var token = _tokenService.GenerateToken(user);
                var refreshToken = _tokenService.GenerateRefreshToken();
                user.RefreshToken = refreshToken;
                user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(90);
                await _clientService.UpdateUserTokens(user);

                return Ok(new
                {
                    accessToken = token,
                    refreshToken = refreshToken,
                    user = new ClientDTO
                    {
                        Id = user.Id,
                        Name = user.Name,
                        Email = user.Email,
                        Role = user.Role,
                        AvatarUrl = user.AvatarUrl
                    }
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GoogleLogin Error]: {ex}");
                return StatusCode(500, new { message = "Error during Google authentication: " + ex.Message });
            }
        }

        [HttpPost("refresh")]
        public async Task<ActionResult> RefreshToken(TokensDTO tokensDTO)
        {
            if (string.IsNullOrWhiteSpace(tokensDTO.RefreshToken))
            {
                return BadRequest("Refresh token is required");
            }

            var client = await _clientService.IsRefreshTokenOk(tokensDTO.RefreshToken);
            if (client == null || client.RefreshTokenExpiryTime <= DateTime.UtcNow)
            {
                return Unauthorized("Invalid or expired refresh token");
            }

            if (!string.IsNullOrWhiteSpace(tokensDTO.AccessToken))
            {
                try
                {
                    var principal = _tokenService.GetPrincipalFromExpiredToken(tokensDTO.AccessToken);
                    var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier);
                    if (!string.IsNullOrEmpty(userId) && userId != client.Id.ToString())
                    {
                        return Unauthorized("User mismatch or bad refresh token");
                    }
                }
                catch
                {
                    // If access token signature or lifetime cannot be parsed, refresh token still verifies user
                }
            }

            var newToken = _tokenService.GenerateToken(client);
            var newRefreshToken = _tokenService.GenerateRefreshToken();

            client.RefreshToken = newRefreshToken;
            // Продлеваем сессию на 90 дней при каждом обновлении
            client.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(90);

            if (!await _clientService.UpdateUserTokens(client))
            {
                return BadRequest("Error when UpdateUserTokens");
            }

            return Ok(new TokensDTO { AccessToken = newToken, RefreshToken = newRefreshToken });
        }
    }
}
