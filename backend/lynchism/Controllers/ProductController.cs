using lynchism.DTO;
using lynchism.Models;
using lynchism.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace lynchism.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class ProductController: Controller
    {
        private readonly ProductService _productService;

        public ProductController(ProductService productService)
        {
            _productService = productService;
        }

        [HttpGet("GetProducts")]
        public async Task<ActionResult<List<Product>>> GetProducts()
        {
            return Ok(await _productService.GetAll());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Product>> GetProduct(int id)
        {
            var product = await _productService.GetProductById(id);
            if (product == null) return NotFound("Товар не найден");
            return Ok(product);
        }

        [Authorize(Roles = "Admin,Staff,Manager")]
        [HttpPost("create")]
        public async Task<ActionResult<Product>> AddProduct([FromBody] Product product)
        {
            var created = await _productService.AddProduct(product);
            if (created == null) return BadRequest("Не удалось создать товар");
            return Ok(created);
        }

        [Authorize(Roles = "Admin,Staff,Manager")]
        [HttpPut("change/{id}")]
        public async Task<ActionResult<Product>> ChangeProduct(int id, [FromBody] ProductDTO product)
        {
            var find_product = await _productService.GetProductById(id);
            if (find_product == null) return NotFound("Товар не найден");
            return Ok(await _productService.UpdateProduct(product, id));
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("delete/{id}")]
        public async Task<ActionResult<bool>> DeleteProduct(int id)
        {
            var find_product = await _productService.GetProductById(id);
            if (find_product == null) return NotFound("Товар не найден");
            return Ok(await _productService.DeleteProduct(id));
        }

        [Authorize(Roles = "Admin,Staff,Manager")]
        [HttpPut("update_stock/{productId}")]
        public async Task<ActionResult<bool>> UpdateStock(int productId, [FromBody] List<ProductSize> sizes)
        {
            return Ok(await _productService.UpdateStock(productId, sizes));
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("clear-everything")]
        public async Task<ActionResult> ClearAll()
        {
            return Ok(await _productService.DeleteAll());
        }
    }
}
