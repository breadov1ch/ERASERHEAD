using Microsoft.EntityFrameworkCore;
using lynchism.Models;

namespace lynchism
{
    public class MyDbContext:DbContext
    {
        public MyDbContext(DbContextOptions<MyDbContext> options)
           : base(options) { }
        public DbSet<Client> Clients { get; set; }       
        public DbSet<Product> Products { get; set; }      
        public DbSet<ProductSize> ProductSizes { get; set; } 
        public DbSet<CartItem> CartItems { get; set; }      
        public DbSet<Order> Orders { get; set; }            
        public DbSet<OrderItem> OrderItems { get; set; }   
        public DbSet<PromoCode> PromoCodes { get; set; }      
    }
}