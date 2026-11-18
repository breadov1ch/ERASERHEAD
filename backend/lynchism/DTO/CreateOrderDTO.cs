namespace lynchism.DTO
{
    public class CreateOrderDto
    {
        public string Phone { get; set; } = null!;
        public string FirstName { get; set; } = null!;
        public string LastName { get; set; } = null!;
        public string ZipCode { get; set; } = null!;
        public string StreetAddress { get; set; } = null!;
        public string PaymentMethod { get; set; } = null!;
        public string Country { get; set; } = null!;
        public string Carrier { get; set; } = "Nova Poshta";
        public string DeliveryType { get; set; } = "Warehouse";
        public string? DeliveryBranch { get; set; }
        public string? DeliveryCity { get; set; }
        public decimal DeliveryCost { get; set; } = 0;
        public string? PromoCode { get; set; }
    }
}