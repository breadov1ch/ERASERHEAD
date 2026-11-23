using lynchism.Models;

namespace lynchism.DTO
{
    public class ProductDTO
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public string Category { get; set; } = string.Empty;
        public string ImageURL { get; set; } = string.Empty;
        public List<string> Images { get; set; } = new();
        public string Silhouette { get; set; } = "OVERSIZED";
        public string Fabric { get; set; } = "100% COTTON";
        public string Gender { get; set; } = "Unisex";
        public string? SizeChartJson { get; set; }
        public string? ColorsJson { get; set; }
        public bool IsPreOrder { get; set; } = false;
        public decimal? OldPrice { get; set; }
        public bool IsNew { get; set; } = false;
        public DateTime? NewUntil { get; set; }
        public List<ProductSize>? Sizes { get; set; }
    }
}
