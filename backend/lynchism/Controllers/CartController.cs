using lynchism.Models;
using lynchism.DTO;
using lynchism.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace lynchism.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class CartController : Controller
    {
        private readonly CartService _cartService;

        public CartController(CartService cartService)
        {
            _cartService = cartService;
        }

        [Authorize]
        [HttpPost("add-to-cart")]
        public async Task<ActionResult> AddToCart([FromBody] AddToCartDTO dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userId, out int clientId)) return Unauthorized();

            var item = new CartItem
            {
                ClientId = clientId,
                ProductId = dto.ProductId,
                Quantity = dto.Quantity > 0 ? dto.Quantity : 1,
                Size = dto.Size,
                Color = dto.Color ?? string.Empty,
                AddedDate = DateTime.UtcNow
            };

            var result = await _cartService.AddToCart(item);
            if (result == null) return BadRequest("Product or size is incorrect");
            return Ok("Товар добавлен в корзину");
        }

        [Authorize]
        [HttpPost("merge-cart")]
        public async Task<ActionResult> MergeCart([FromBody] List<AddToCartDTO> guestItems)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userId, out int clientId)) return Unauthorized();

            if (guestItems != null && guestItems.Any())
            {
                foreach (var dto in guestItems)
                {
                    var item = new CartItem
                    {
                        ClientId = clientId,
                        ProductId = dto.ProductId,
                        Quantity = dto.Quantity > 0 ? dto.Quantity : 1,
                        Size = dto.Size,
                        Color = dto.Color ?? string.Empty,
                        AddedDate = DateTime.UtcNow
                    };
                    await _cartService.AddToCart(item);
                }
            }

            return Ok("Корзина успешно синхронизирована");
        }

        [Authorize]
        [HttpGet("get-cart")]
        public async Task<ActionResult<List<CartItemDTO>>> GetCartByClient()
        {
            var nameIdentifier = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(nameIdentifier) || !int.TryParse(nameIdentifier, out int id))
            {
                return Unauthorized("Не удалось идентифицировать пользователя.");
            }
            List<CartItemDTO> cartItems = await _cartService.GetCartByClientId(id);
            return Ok(cartItems);
        }

        [Authorize]
        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteCart(int id)
        {
            var result = await _cartService.DeleteFromCart(id);
            if (result) return Ok();
            return BadRequest();
        }

        [Authorize]
        [HttpPut("change-quantity")]
        public async Task<ActionResult<CartItem>> ChangeQuantity(int id, int quantity)
        {
            var cartItem = await _cartService.ChangeProductQuantity(id, quantity);
            if(cartItem != null) return Ok(cartItem);
            return BadRequest();
        }

        [Authorize]
        [HttpGet("get-cartItem-count")]
        public async Task<ActionResult<int>> GetCartItemCount()
        {
            var nameIdentifier = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(nameIdentifier) || !int.TryParse(nameIdentifier, out int id))
            {
                return Unauthorized("Не удалось идентифицировать пользователя.");
            }
            return await _cartService.GetItemCount(id);
        }
    }
}
