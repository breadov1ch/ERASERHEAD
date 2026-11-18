using lynchism.DTO;
using lynchism.Models;
using Microsoft.EntityFrameworkCore;
using System.Collections.Concurrent;

namespace lynchism.Services
{
    public class PendingRegistration
    {
        public string Email { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public DateTime Expiry { get; set; }
        public int Attempts { get; set; }
    }

    public class ClientService
    {
        private readonly MyDbContext _context;
        private static readonly ConcurrentDictionary<string, PendingRegistration> _pendingRegistrations = new();

        public ClientService(MyDbContext context)
        {
            _context = context;
        }

        public void SavePendingRegistration(string email, string name, string passwordHash, string code)
        {
            var normEmail = email.Trim().ToLower();
            _pendingRegistrations[normEmail] = new PendingRegistration
            {
                Email = normEmail,
                Name = name,
                PasswordHash = passwordHash,
                Code = code.Trim(),
                Expiry = DateTime.UtcNow.AddMinutes(15),
                Attempts = 0
            };
        }

        public PendingRegistration? GetPendingRegistration(string email)
        {
            var normEmail = email.Trim().ToLower();
            if (_pendingRegistrations.TryGetValue(normEmail, out var reg))
            {
                if (reg.Expiry >= DateTime.UtcNow) return reg;
                _pendingRegistrations.TryRemove(normEmail, out _);
            }
            return null;
        }

        public void RemovePendingRegistration(string email)
        {
            _pendingRegistrations.TryRemove(email.Trim().ToLower(), out _);
        }

        public async Task<Client?> IsRefreshTokenOk(string refreshToken)
        {
            return await _context.Clients.FirstOrDefaultAsync(c => c.RefreshToken == refreshToken);
        }

        public async Task<List<Client>> GetAll() => await _context.Clients.OrderBy(c => c.Id).ToListAsync();

        public async Task<Client?> GetClientById(int id) => await _context.Clients.FirstOrDefaultAsync(c => c.Id == id);

        public async Task<Client?> GetClientByEmail(string email) => 
            await _context.Clients.FirstOrDefaultAsync(c => c.Email.ToLower() == email.Trim().ToLower());

        public async Task<Client> AddClient(Client client)
        {
            _context.Clients.Add(client);
            await _context.SaveChangesAsync();
            return client;
        }

        public async Task<bool> UpdateClient(Client client)
        {
            _context.Clients.Update(client);
            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<bool> UpdateProfile(int clientId, string name, string? avatarUrl)
        {
            var client = await GetClientById(clientId);
            if (client == null) return false;

            if (!string.IsNullOrWhiteSpace(name))
            {
                client.Name = name.Trim();
            }
            if (!string.IsNullOrWhiteSpace(avatarUrl))
            {
                client.AvatarUrl = avatarUrl.Trim();
            }

            _context.Clients.Update(client);
            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<(bool success, string error)> ChangePassword(int clientId, string oldPassword, string newPassword)
        {
            var client = await GetClientById(clientId);
            if (client == null) return (false, "User not found");

            if (!BCrypt.Net.BCrypt.Verify(oldPassword, client.PasswordHash))
            {
                return (false, "Current password is incorrect");
            }

            client.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
            _context.Clients.Update(client);
            await _context.SaveChangesAsync();
            return (true, string.Empty);
        }

        public async Task<bool> SetResetCode(string email, string code)
        {
            var client = await GetClientByEmail(email);
            if (client == null) return false;

            client.ResetCode = code;
            client.ResetCodeExpiry = DateTime.UtcNow.AddMinutes(15);
            _context.Clients.Update(client);
            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<(bool success, string error)> ResetPasswordWithCode(string email, string code, string newPassword)
        {
            var client = await GetClientByEmail(email);
            if (client == null) return (false, "Account with this email does not exist");

            if (string.IsNullOrWhiteSpace(client.ResetCode) || client.ResetCode != code.Trim())
            {
                return (false, "Invalid recovery code");
            }

            if (client.ResetCodeExpiry == null || client.ResetCodeExpiry < DateTime.UtcNow)
            {
                return (false, "Recovery code has expired. Request a new one.");
            }

            client.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
            client.ResetCode = null;
            client.ResetCodeExpiry = null;
            _context.Clients.Update(client);
            await _context.SaveChangesAsync();
            return (true, string.Empty);
        }

        public async Task<bool> DeleteClient(int id)
        {
            var client = await _context.Clients.FirstOrDefaultAsync(c => c.Id == id);
            if (client == null) return false;

            _context.Clients.Remove(client);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> UpdateUserTokens(Client client)
        {
            try
            {
                _context.Clients.Update(client);
                return await _context.SaveChangesAsync() > 0;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Ошибка при обновлении токенов: {ex.Message}");
                return false;
            }
        }

        public async Task<Client?> ValidateUser(ClientLoginDTO credentials)
        {
            var client = await _context.Clients.FirstOrDefaultAsync(
                u => u.Email.ToLower() == credentials.Email.Trim().ToLower());

            if (client == null)
                return null;

            if (!BCrypt.Net.BCrypt.Verify(credentials.Password, client.PasswordHash))
                return null;

            return client;
        }
    }
}
