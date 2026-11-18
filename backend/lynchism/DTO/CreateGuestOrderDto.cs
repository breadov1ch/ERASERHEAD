using System.Collections.Generic;

namespace lynchism.DTO
{
    public class GuestCartItemDto
    {
        public int ProductId { get; set; }
        public string Size { get; set; } = null!;
        public string? Color { get; set; } = string.Empty;
        public int Quantity { get; set; }
    }

    public class CreateGuestOrderDto
    {
        public string Email { get; set; } = null!;
        public string Phone { get; set; } = null!;
        public string FirstName { get; set; } = null!;
        public string LastName { get; set; } = null!;
        public string ZipCode { get; set; } = null!;
        public string StreetAddress { get; set; } = null!;
        public string PaymentMethod { get; set; } = "Card";
        public string Country { get; set; } = "Ukraine";
        public string Carrier { get; set; } = "Nova Poshta";
        public string DeliveryType { get; set; } = "Warehouse";
        public string? DeliveryBranch { get; set; }
        public string? DeliveryCity { get; set; }
        public decimal DeliveryCost { get; set; } = 0;
        public string? PromoCode { get; set; }
        public List<GuestCartItemDto> Items { get; set; } = new();
    }
}
