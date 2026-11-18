namespace lynchism.Models
{
    public class Order
    {
        public int Id { get; set; }
        public decimal Sum { get; set; }
        public int ClientId { get; set; }
        public Client Client { get; set; } = null!;
        public DateTime DateOfIssuance { get; set; }
        public string Status { get; set; } = "Pending";
        public string PaymentMethod { get; set; }


        public string FirstName { get; set; } = null!;
        public string LastName { get; set; } = null!;
        public string Phone { get; set; } = null!;
        public string Country { get; set; } = "Ukraine";
        public string StreetAddress { get; set; } = null!;
        public string ZipCode { get; set; } = null!;

        public string Carrier { get; set; } = "Nova Poshta";
        public string DeliveryType { get; set; } = "Warehouse";
        public string? DeliveryBranch { get; set; }
        public string? DeliveryCity { get; set; }
        public decimal DeliveryCost { get; set; } = 0;
        public string? PromoCode { get; set; }
        public decimal DiscountSum { get; set; } = 0;

        public List<OrderItem> Products { get; set; } = new();
    }
}
