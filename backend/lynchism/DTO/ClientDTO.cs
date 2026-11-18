namespace lynchism.DTO
{
    public class ClientDTO
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string AvatarUrl { get; set; } = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80";
    }

    public class RegisterRequestDTO
    {
        public string? Name { get; set; }
        public string Email { get; set; } = string.Empty;
        public string? Password { get; set; }
    }

    public class SendRegisterCodeDTO
    {
        public string Email { get; set; } = string.Empty;
        public string? Name { get; set; }
        public string? Password { get; set; }
    }

    public class VerifyRegisterCodeDTO
    {
        public string Email { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
    }

    public class ForgotPasswordDTO
    {
        public string Email { get; set; } = string.Empty;
    }

    public class ResetPasswordDTO
    {
        public string Email { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }

    public class UpdateProfileDTO
    {
        public string Name { get; set; } = string.Empty;
        public string? AvatarUrl { get; set; }
    }

    public class ChangePasswordDTO
    {
        public string OldPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }

    public class UpdateRoleDTO
    {
        public int ClientId { get; set; }
        public string Role { get; set; } = string.Empty;
    }

    public class CreateStaffDTO
    {
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string Role { get; set; } = "Staff";
    }
}
