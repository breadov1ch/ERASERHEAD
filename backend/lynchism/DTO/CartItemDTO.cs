namespace lynchism.DTO
{
    public class CartItemDTO
    {
        public int Id { get; set; } 
        public int ProductId { get; set; }
        public string ProductName { get; set; } = null!;
        public decimal Price { get; set; }
        public string Size { get; set; } = null!;
        public string Color { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public string ImageURL { get; set; } = null!;
        public bool IsPreOrder { get; set; } = false;
        public int MaxStock { get; set; } = int.MaxValue;
    }
}