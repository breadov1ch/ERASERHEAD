using System;

namespace lynchism.Models
{
    public class PromoCode
    {
        public int Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public decimal DiscountPercent { get; set; } = 0; // e.g. 15 for 15%
        public decimal DiscountAmount { get; set; } = 0;  // e.g. 200 for 200 UAH
        public decimal MinOrderSum { get; set; } = 0;
        public bool IsActive { get; set; } = true;
        public DateTime? ExpiryDate { get; set; }
        public int UsageCount { get; set; } = 0;
        public int? MaxUsages { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
