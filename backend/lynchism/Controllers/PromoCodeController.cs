using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using lynchism.Models;

namespace lynchism.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class PromoCodeController : Controller
    {
        private readonly MyDbContext _context;

        public PromoCodeController(MyDbContext context)
        {
            _context = context;
        }

        public class ValidatePromoDto
        {
            public string Code { get; set; } = string.Empty;
            public decimal Subtotal { get; set; } = 0;
        }

        [HttpGet("validate")]
        public async Task<ActionResult> ValidatePromo([FromQuery] string code, [FromQuery] decimal subtotal = 0)
        {
            if (string.IsNullOrWhiteSpace(code))
            {
                return BadRequest(new { valid = false, message = "Введіть промокод" });
            }

            string cleanCode = code.Trim().ToUpperInvariant();
            var promo = await _context.PromoCodes
                .FirstOrDefaultAsync(p => p.Code.ToUpper() == cleanCode);

            if (promo == null)
            {
                return Ok(new { valid = false, message = "Промокод не знайдено" });
            }

            if (!promo.IsActive)
            {
                return Ok(new { valid = false, message = "Цей промокод наразі неактивний" });
            }

            if (promo.ExpiryDate.HasValue && promo.ExpiryDate.Value < DateTime.UtcNow)
            {
                return Ok(new { valid = false, message = "Термін дії цього промокоду минув" });
            }

            if (promo.MaxUsages.HasValue && promo.UsageCount >= promo.MaxUsages.Value)
            {
                return Ok(new { valid = false, message = "Ліміт використання цього промокоду вичерпано" });
            }

            if (promo.MinOrderSum > 0 && subtotal < promo.MinOrderSum)
            {
                return Ok(new { valid = false, message = $"Мінімальна сума замовлення для цього промокоду: {promo.MinOrderSum} ₴" });
            }

            decimal discount = 0;
            if (promo.DiscountPercent > 0)
            {
                discount = Math.Round(subtotal * (promo.DiscountPercent / 100m), 0);
            }
            else if (promo.DiscountAmount > 0)
            {
                discount = Math.Min(subtotal, promo.DiscountAmount);
            }

            return Ok(new
            {
                valid = true,
                code = promo.Code,
                discountPercent = promo.DiscountPercent,
                discountAmount = promo.DiscountAmount,
                discount = discount,
                message = promo.DiscountPercent > 0 
                    ? $"Знижка {promo.DiscountPercent}% застосована (-{discount} ₴)" 
                    : $"Знижка {discount} ₴ застосована"
            });
        }

        [HttpGet("all")]
        public async Task<ActionResult> GetAll()
        {
            var list = await _context.PromoCodes
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();
            return Ok(list);
        }

        public class CreatePromoDto
        {
            public string Code { get; set; } = string.Empty;
            public decimal DiscountPercent { get; set; } = 0;
            public decimal DiscountAmount { get; set; } = 0;
            public decimal MinOrderSum { get; set; } = 0;
            public int? MaxUsages { get; set; }
            public int? DaysValid { get; set; }
        }

        [HttpPost("create")]
        public async Task<ActionResult> Create([FromBody] CreatePromoDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Code))
            {
                return BadRequest(new { message = "Введіть промокод" });
            }

            string cleanCode = dto.Code.Trim().ToUpperInvariant();
            var existing = await _context.PromoCodes.FirstOrDefaultAsync(p => p.Code.ToUpper() == cleanCode);
            if (existing != null)
            {
                return BadRequest(new { message = $"Промокод '{cleanCode}' вже існує" });
            }

            DateTime? expiry = dto.DaysValid.HasValue && dto.DaysValid > 0
                ? DateTime.UtcNow.AddDays(dto.DaysValid.Value)
                : null;

            var promo = new PromoCode
            {
                Code = cleanCode,
                DiscountPercent = Math.Clamp(dto.DiscountPercent, 0, 100),
                DiscountAmount = Math.Max(0, dto.DiscountAmount),
                MinOrderSum = Math.Max(0, dto.MinOrderSum),
                MaxUsages = dto.MaxUsages,
                ExpiryDate = expiry,
                IsActive = true,
                UsageCount = 0,
                CreatedAt = DateTime.UtcNow
            };

            _context.PromoCodes.Add(promo);
            await _context.SaveChangesAsync();

            return Ok(promo);
        }

        [HttpDelete("delete/{id}")]
        public async Task<ActionResult> Delete(int id)
        {
            var promo = await _context.PromoCodes.FindAsync(id);
            if (promo == null) return NotFound("Промокод не знайдено");

            _context.PromoCodes.Remove(promo);
            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }

        [HttpPut("toggle/{id}")]
        public async Task<ActionResult> Toggle(int id)
        {
            var promo = await _context.PromoCodes.FindAsync(id);
            if (promo == null) return NotFound("Промокод не знайдено");

            promo.IsActive = !promo.IsActive;
            await _context.SaveChangesAsync();
            return Ok(promo);
        }
    }
}
