using lynchism.DTO;
using lynchism.Models;
using Microsoft.EntityFrameworkCore;
using System.Drawing;

namespace lynchism.Services
{
    public class ProductService
    {
        private readonly MyDbContext _context;

        public ProductService(MyDbContext context)
        {
            _context = context;
        }

        private void EnsureImagesAndAttributes(Product product)
        {
            if (product.Images == null)
            {
                product.Images = new List<string>();
            }

            if (!product.Images.Any() && !string.IsNullOrWhiteSpace(product.ImageURL))
            {
                product.Images.Add(product.ImageURL);
            }
            else if (product.Images.Any() && string.IsNullOrWhiteSpace(product.ImageURL))
            {
                product.ImageURL = product.Images[0];
            }

            if (string.IsNullOrWhiteSpace(product.Silhouette)) product.Silhouette = "OVERSIZED";
            if (string.IsNullOrWhiteSpace(product.Fabric)) product.Fabric = "100% COTTON";
            if (string.IsNullOrWhiteSpace(product.Gender)) product.Gender = "Unisex";
        }

        public async Task<List<ProductSize>> GetProductSizes(int product_id) => await _context.ProductSizes
            .Where(ps => ps.ProductId == product_id)
            .ToListAsync();

        public async Task<List<Product>> GetAll()
        {
            var products = await _context.Products
                .Include(p => p.Sizes)
                .OrderBy(p => p.Id)
                .ToListAsync();

            foreach (var p in products)
            {
                EnsureImagesAndAttributes(p);
            }
            return products;
        }

        public async Task<Product?> GetProductById(int id)
        {
            var product = await _context.Products
                .Include(p => p.Sizes)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (product != null)
            {
                EnsureImagesAndAttributes(product);
            }
            return product;
        }

        public async Task<List<Product>> GetByCategory(string category)
        {
            var products = await _context.Products
                .Include(p => p.Sizes)
                .Where(p => p.Category == category)
                .ToListAsync();

            foreach (var p in products)
            {
                EnsureImagesAndAttributes(p);
            }
            return products;
        }

        public async Task<Product?> AddProduct(Product product)
        {
            if (product == null) return null;

            EnsureImagesAndAttributes(product);

            _context.Products.Add(product);
            await _context.SaveChangesAsync();
            return product;
        }

        public async Task<Product?> UpdateProduct(ProductDTO product, int id)
        {
            Product? finded_product = await GetProductById(id);

            if (finded_product != null)
            {
                finded_product.Name = product.Name;
                finded_product.Description = product.Description;
                finded_product.Price = product.Price;
                finded_product.Category = product.Category;
                finded_product.ImageURL = product.ImageURL;
                finded_product.Images = product.Images ?? new List<string>();
                finded_product.Silhouette = string.IsNullOrWhiteSpace(product.Silhouette) ? "OVERSIZED" : product.Silhouette;
                finded_product.Fabric = string.IsNullOrWhiteSpace(product.Fabric) ? "100% COTTON" : product.Fabric;
                finded_product.Gender = string.IsNullOrWhiteSpace(product.Gender) ? "Unisex" : product.Gender;
                if (!string.IsNullOrWhiteSpace(product.SizeChartJson))
                {
                    finded_product.SizeChartJson = product.SizeChartJson;
                }
                finded_product.ColorsJson = product.ColorsJson;
                finded_product.IsPreOrder = product.IsPreOrder;
                finded_product.OldPrice = product.OldPrice;
                finded_product.IsNew = product.IsNew;
                finded_product.NewUntil = product.NewUntil;

                EnsureImagesAndAttributes(finded_product);

                if (product.Sizes != null && product.Sizes.Any())
                {
                    await UpdateStock(id, product.Sizes);
                }

                await _context.SaveChangesAsync();
                return finded_product;
            }
            return null;
        }

        public async Task<List<ProductSize>> UpdateStock(int productId, List<ProductSize> sizes)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var dbSizes = await _context.ProductSizes
                    .Where(ps => ps.ProductId == productId)
                    .ToListAsync();

                var sizesToDelete = dbSizes
                    .Where(db => !sizes.Any(s => s.Size == db.Size))
                    .ToList();

                if (sizesToDelete.Any())
                {
                    _context.ProductSizes.RemoveRange(sizesToDelete);
                }

                foreach (var incomingSize in sizes)
                {
                    var existing = dbSizes.FirstOrDefault(db => db.Size == incomingSize.Size);

                    if (existing != null)
                    {
                        existing.Quantity = incomingSize.Quantity;
                    }
                    else
                    {
                        _context.ProductSizes.Add(new ProductSize
                        {
                            ProductId = productId,
                            Size = incomingSize.Size,
                            Quantity = incomingSize.Quantity
                        });
                    }
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return sizes;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                Console.WriteLine($"Ошибка при обновлении склада: {ex.Message}");
                throw;
            }
        }

        public async Task<bool> DeleteProduct(int id)
        {
            Product? finded_product = await GetProductById(id);
            if (finded_product == null) return false;
            _context.Remove(finded_product);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAll()
        {
            await _context.Database.ExecuteSqlRawAsync(@"TRUNCATE TABLE ""CartItems"", ""OrderItems"", ""ProductSizes"", ""Products"" CASCADE;");
            return true;
        }
    }
}
