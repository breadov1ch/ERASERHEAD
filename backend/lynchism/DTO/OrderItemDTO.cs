namespace lynchism.DTO
{
    public class OrderItemDTO
    {
        public string ProductName { get; set; } = null!;
        public int Quantity { get; set; }
        public decimal Price { get; set; }
        public string Size { get; set; } = null!;
        public string? Color { get; set; }
        public int ProductId { get; set; }
        public string? ImageURL { get; set; }
    }
}
