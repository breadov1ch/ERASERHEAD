using System;
using System.Collections.Generic;

namespace lynchism.DTO
{
    public class OrderDTO
    {
        public int Id { get; set; }
        public decimal TotalSum { get; set; }
        public DateTime Date { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? StreetAddress { get; set; }
        public string? Phone { get; set; }
        public string? PaymentMethod { get; set; }
        public string? Carrier { get; set; }
        public string? DeliveryType { get; set; }
        public string? DeliveryBranch { get; set; }
        public string? DeliveryCity { get; set; }
        public decimal DeliveryCost { get; set; } = 0;
        public string? PromoCode { get; set; }
        public decimal DiscountSum { get; set; } = 0;
        public List<OrderItemDTO> Items { get; set; } = new();
    }
}
