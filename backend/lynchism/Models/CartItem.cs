using System.Text.Json.Serialization;

namespace lynchism.Models
{
    public class CartItem
    {
        public int Id { get; set; }
        public int ClientId { get; set; }
        [JsonIgnore]
        public Client Client { get; set; } = null!;
        public int ProductId { get; set; }
        public Product Product { get; set; } = null!;
        public int Quantity { get; set; }
        public string Size { get; set; }
        public string Color { get; set; } = string.Empty;
        public DateTime AddedDate { get; set; }
    }
}