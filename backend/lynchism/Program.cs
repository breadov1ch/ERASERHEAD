using lynchism;
using lynchism.Models;
using lynchism.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Npgsql.EntityFrameworkCore.PostgreSQL;
using System;
using System.Text;


var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();





builder.Services.AddAuthentication(options => {
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true, 
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]))
    };
});
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "������ JWT �����"
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<String>()
        }
    });
});

// ����������� ��������� �� (SQLite)
builder.Services.AddDbContext<MyDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    options.UseNpgsql(connectionString);
});

builder.Services.AddScoped<ClientService>();
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<ProductService>();
builder.Services.AddScoped<CartService>();
builder.Services.AddScoped<OrderService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        policy => policy.SetIsOriginAllowed(origin => true) // Разрешает ЛЮБОЙ домен
                        .AllowAnyMethod()
                        .AllowAnyHeader()
                        .AllowCredentials());
});

static List<ProductSize> GetDefaultSizes()
{
    return new List<ProductSize>
    {
        new ProductSize { Size = "S", Quantity = 10 },
        new ProductSize { Size = "M", Quantity = 15 },
        new ProductSize { Size = "L", Quantity = 10 }
    };
}

var app = builder.Build();
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var _context = services.GetRequiredService<MyDbContext>(); // Замени на имя своего контекста

    // 2. Проверяем, пустая ли база (чтобы не дублировать товары при каждом запуске)
    if (!_context.Products.Any())
    {
        var opiumDrop = new List<Product>
        {
            // --- BATCH 1: TOPS ---
            new Product { Name = "Vandal Distorted Tee", Description = "Premium heavyweight jersey with digital hardware prints. Engineered for an extreme oversized silhouette and raw aesthetic.", Price = 2800, Category = "Tops", ImageURL = "https://i.ibb.co/8grP9pfd/photo-35-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },
            new Product { Name = "Cyber-Grit Longsleeve", Description = "Breathable tech-mesh fabric with contrast stitching details. Perfectly suited for complex avant-garde layering outfits.", Price = 3200, Category = "Tops", ImageURL = "https://i.ibb.co/207dMQKZ/photo-36-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },
            new Product { Name = "Acid Wash Boxy Tee", Description = "Heavy cotton tee treated with a custom acid wash for a gritty texture. Features dropped shoulders and a cropped, boxy fit.", Price = 2900, Category = "Tops", ImageURL = "https://i.ibb.co/XfwKHsyB/photo-37-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },
            new Product { Name = "Obsidian Layered Top", Description = "Dual-layered design featuring raw edges and exposed seams. A signature piece for the ultimate dark-minimalist look.", Price = 3500, Category = "Tops", ImageURL = "https://i.ibb.co/f5bzLFT/photo-38-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },

            // --- BATCH 2: PANTS ---
            new Product { Name = "Shadow Flare Denim", Description = "Japanese selvedge denim featuring a signature multi-stack flared silhouette. The deep black wash creates a sleek, high-fashion profile.", Price = 4500, Category = "Pants", ImageURL = "https://i.ibb.co/0pBFkbnx/photo-39-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },
            new Product { Name = "Abyss Cargo System", Description = "Reinforced tactical pockets combined with high-density distressed cotton fabric. Features adjustable leg straps for a customizable industrial fit.", Price = 5200, Category = "Pants", ImageURL = "https://i.ibb.co/Q795GXm0/photo-41-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },
            new Product { Name = "Graphite Stacked Jeans", Description = "Extra-long inseam denim designed to stack naturally at the ankle. Treated with a unique graphite-oxide wash for a metallic sheen.", Price = 4300, Category = "Pants", ImageURL = "https://i.ibb.co/kgCzs614/photo-40-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },
            new Product { Name = "Void Walker Trousers", Description = "Ultra-wide leg trousers made from premium structured denim. Engineered for a dramatic silhouette that moves with the wearer.", Price = 4800, Category = "Pants", ImageURL = "https://i.ibb.co/Txthqfc0/photo-42-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },

            // --- BATCH 3: OUTERWEAR ---
            new Product { Name = "Titanium Shell Parka", Description = "Water-resistant tech shell with articulated sleeves and metallic zippers. A core piece for navigating the harsh urban landscape.", Price = 7800, Category = "Outerwear", ImageURL = "https://i.ibb.co/6J0dMJK1/photo-43-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },
            new Product { Name = "Onyx Bomber V3", Description = "Boxy-fit insulated bomber jacket with a custom matte nylon finish. Detailed with hidden security pockets and reinforced ribbed cuffs.", Price = 6500, Category = "Outerwear", ImageURL = "https://i.ibb.co/3y5wFBrn/photo-44-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },
            new Product { Name = "Phantom Tactical Vest", Description = "Modular vest system featuring laser-cut MOLLE attachments. Offers multiple storage options for an aggressive techwear aesthetic.", Price = 5800, Category = "Outerwear", ImageURL = "https://i.ibb.co/cK0vNRxq/photo-45-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },
            new Product { Name = "Cinder Puffer Jacket", Description = "High-loft insulation encased in a distressed, ash-toned fabric. Provides extreme warmth without sacrificing the grunge-forward look.", Price = 8200, Category = "Outerwear", ImageURL = "https://i.ibb.co/XfYWXzph/photo-46-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },

            // --- BATCH 4: ACCESSORIES ---
            new Product { Name = "Industrial Link Belt", Description = "Constructed from military-grade webbing and heavy-duty steel hardware. The final mechanical touch to complete any cyber-grunge silhouette.", Price = 1800, Category = "Accessories", ImageURL = "https://i.ibb.co/WJhsM5J/photo-47-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },
            new Product { Name = "Void Crossbody Bag", Description = "Minimalist carry system with a waterproof exterior and magnetic buckles. Designed for seamless integration into everyday high-fashion looks.", Price = 2400, Category = "Accessories", ImageURL = "https://i.ibb.co/TDLHQkqG/photo-48-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },
            new Product { Name = "Hardware Buckle Choker", Description = "Handcrafted leather accessory with polished chrome buckle closures. Adds a sharp, industrial edge to any dark-minimalist outfit.", Price = 1500, Category = "Accessories", ImageURL = "https://i.ibb.co/MxXH21HM/photo-49-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },
            new Product { Name = "Chrome Link Chain", Description = "Heavy-gauge steel chain with an oxidized finish for a vintage feel. Can be worn as a necklace or attached to denim for added detail.", Price = 1900, Category = "Accessories", ImageURL = "https://i.ibb.co/zVqxSWh7/photo-50-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },

            // --- КАТЕГОРИИ ПОВТОРЯЮТСЯ (Tops) ---
            new Product { Name = "Grim Reaper Hoodie", Description = "Heavyweight fleece hoodie with aggressive distressing and a deep hood. Features a faded 'reaper' graphic on the back.", Price = 4200, Category = "Tops", ImageURL = "https://i.ibb.co/sdMgSpLM/photo-1-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },
            new Product { Name = "Static Noise Tee", Description = "Premium cotton tee with a digital noise print and raw-cut collar. The loose fit ensures maximum comfort and a relaxed vibe.", Price = 2750, Category = "Tops", ImageURL = "https://i.ibb.co/bghXCs1Y/photo-2-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },
            new Product { Name = "Vortex Knit Sweater", Description = "Intarsia knit sweater with a distorted vortex pattern and frayed edges. A statement piece that bridges the gap between luxury and grunge.", Price = 5500, Category = "Tops", ImageURL = "https://i.ibb.co/BKZ9PvhK/photo-3-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },
            new Product { Name = "Echo Distressed Tee", Description = "Lightweight jersey top featuring subtle bleach splatters and hand-shredded details. Perfect for adding texture to a layered black outfit.", Price = 2600, Category = "Tops", ImageURL = "https://i.ibb.co/Kj0tN72K/photo-4-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },

            // --- PANTS (2) ---
            new Product { Name = "Rusty Metal Denim", Description = "Jeans featuring a unique brown-tinted wash inspired by industrial rust. Each pair is hand-finished for a one-of-a-kind wear pattern.", Price = 4100, Category = "Pants", ImageURL = "https://i.ibb.co/q3HVNF0g/photo-5-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },
            new Product { Name = "Bleach Void Jeans", Description = "High-contrast bleach splatters on a deep navy background create a stunning visual. The relaxed fit offers a stylish look without restriction.", Price = 3900, Category = "Pants", ImageURL = "https://i.ibb.co/8nDxFbYQ/photo-6-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },
            new Product { Name = "Ego-Death Wide Leg", Description = "Extreme wide-leg pants for a dramatic silhouette and high-fashion impact. Crafted from structured denim that holds its shape perfectly.", Price = 4900, Category = "Pants", ImageURL = "https://i.ibb.co/tTQpqv9T/photo-7-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },
            new Product { Name = "Carbon Fiber Wash Jeans", Description = "Textured denim designed to mimic the weave of carbon fiber material. Highly durable and finished with a subtle matte luster.", Price = 4400, Category = "Pants", ImageURL = "https://i.ibb.co/N2jsgcRb/photo-8-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },

            // --- OUTERWEAR (2) ---
            new Product { Name = "Ash-Cloud Windbreaker", Description = "Ultra-lightweight windbreaker with a smoky, semi-transparent texture. Features adjustable drawstrings and hidden pockets for utility.", Price = 5100, Category = "Outerwear", ImageURL = "https://i.ibb.co/PGFpDCXb/photo-10-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },
            new Product { Name = "Vortex Coach Jacket", Description = "Structured coach jacket with a custom vortex embroidery on the back. A clean yet aggressive piece for transitions between seasons.", Price = 6200, Category = "Outerwear", ImageURL = "https://i.ibb.co/9HSJ9p1f/photo-11-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },
            new Product { Name = "Chrome-Edge Bomber", Description = "Classic bomber silhouette updated with silver metallic accents and chains. The heavy-duty padding ensures warmth in cold conditions.", Price = 7400, Category = "Outerwear", ImageURL = "https://i.ibb.co/ymsYt85K/photo-12-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },
            new Product { Name = "Industrial Mac Coat", Description = "An avant-garde take on the classic trench coat with oversized pockets. Made from a heavy cotton twill with a waxed finish.", Price = 8900, Category = "Outerwear", ImageURL = "https://i.ibb.co/ZpCWzBW6/photo-13-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },

            // --- ACCESSORIES (2) ---
            new Product { Name = "Static Pattern Scarf", Description = "Extra-long knitted scarf featuring a distorted static noise pattern. Provides both extreme warmth and a strong visual focal point.", Price = 2100, Category = "Accessories", ImageURL = "https://i.ibb.co/TMvpQJjq/photo-14-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },
            new Product { Name = "Titanium Link Bracelet", Description = "Heavy link bracelet made from polished industrial-grade steel. Features a secure buckle closure with engraved branding details.", Price = 1650, Category = "Accessories", ImageURL = "https://i.ibb.co/1tZ2W1v5/photo-15-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },
            new Product { Name = "Ghost Patch Cap", Description = "Distressed denim cap with raw edges and an embroidered 'ghost' patch. The adjustable strap ensures a perfect fit for any head size.", Price = 1350, Category = "Accessories", ImageURL = "https://i.ibb.co/CpXJZXHF/photo-16-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },
            new Product { Name = "Shadow Leather Wallet", Description = "Minimalist bi-fold wallet made from premium matte obsidian leather. Features multiple card slots and a hidden compartment for cash.", Price = 1200, Category = "Accessories", ImageURL = "https://i.ibb.co/GrvbbhY/photo-17-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },

            // --- TOPS (3) ---
            new Product { Name = "Neon Grit Slim Tee", Description = "Slim-fit tee treated with oil-slick reflections and neon highlights. The stretchy fabric ensures a sharp, body-hugging silhouette.", Price = 2950, Category = "Tops", ImageURL = "https://i.ibb.co/JRcmT9T5/photo-18-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },
            new Product { Name = "Obsidian Ribbed Top", Description = "Heavy ribbed cotton top with thumbholes and exposed seams. Designed for a sleek, technical look that fits like a second skin.", Price = 3400, Category = "Tops", ImageURL = "https://i.ibb.co/SYcfDwR/photo-20-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },
            new Product { Name = "Cyber Mesh Tank", Description = "Sheer tech-mesh tank top designed for experimental layering. Features a loose, draped fit and reinforced side seams for durability.", Price = 2300, Category = "Tops", ImageURL = "https://i.ibb.co/sd306nhW/photo-21-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },
            new Product { Name = "Vandal Graphic Tee", Description = "Oversized tee featuring a distorted street-art graphic on the front. Made from a heavy-duty jersey that gets better with every wear.", Price = 2850, Category = "Tops", ImageURL = "https://i.ibb.co/kV8x1Jmv/photo-22-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },

            // --- PANTS (3) ---
            new Product { Name = "Tundra Wash Cargo", Description = "Light-grey denim with a frozen 'tundra' wash and multiple 3D pockets. Provides ample storage and an aggressive urban look.", Price = 5300, Category = "Pants", ImageURL = "https://i.ibb.co/99swkJL4/photo-23-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },
            new Product { Name = "Silver Link Flare", Description = "Flared denim adorned with integrated silver chains and metallic hardware. The ultimate piece for a high-fashion, rock-inspired outfit.", Price = 5600, Category = "Pants", ImageURL = "https://i.ibb.co/WWZtCP1N/photo-24-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },
            new Product { Name = "Midnight Flare Denim", Description = "Classic midnight blue denim with an extreme flared leg and raw edges. The deep color provides a versatile base for any dark outfit.", Price = 4200, Category = "Pants", ImageURL = "https://i.ibb.co/BVCwGPw2/photo-25-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },
            new Product { Name = "Raw Carbon Baggy", Description = "Matte black baggy jeans with a stiff, raw carbon-like finish. Engineered for maximum volume and a sharp, architectural silhouette.", Price = 4700, Category = "Pants", ImageURL = "https://i.ibb.co/CswGDVxP/photo-26-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },

            // --- OUTERWEAR (3) ---
            new Product { Name = "Phantom Stitched Shell", Description = "A technical windbreaker with tonal 'phantom' stitching and a matte finish. Features articulated joints for full range of motion.", Price = 5900, Category = "Outerwear", ImageURL = "https://i.ibb.co/svyrM21S/photo-27-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },
            new Product { Name = "Obsidian Field Jacket", Description = "Military-inspired field jacket updated with a modern, dark-minimalist twist. Multiple hidden compartments provide discrete storage for daily gear.", Price = 6800, Category = "Outerwear", ImageURL = "https://i.ibb.co/svtpP1jg/photo-28-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },
            new Product { Name = "Glitch Print Parka", Description = "Longline parka featuring an all-over digital glitch pattern and metallic accents. Provides excellent protection from the elements in style.", Price = 7500, Category = "Outerwear", ImageURL = "https://i.ibb.co/cXTPpMMc/photo-29-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },
            new Product { Name = "Industrial Leather Biker", Description = "Heavyweight leather biker jacket with custom hardware and a distressed finish. A timeless piece that defines the cyber-grunge look.", Price = 9500, Category = "Outerwear", ImageURL = "https://i.ibb.co/v4TtBnmf/photo-30-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },

            // --- ACCESSORIES (3) ---
            new Product { Name = "Void Walker Mask", Description = "Technical face mask with adjustable straps and a breathable inner lining. Designed for a sleek, futuristic aesthetic during urban transit.", Price = 1200, Category = "Accessories", ImageURL = "https://i.ibb.co/WNz11p88/photo-31-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },
            new Product { Name = "Titanium Key Hook", Description = "Industrial-grade steel key hook with a custom engraved buckle. Easily attaches to belt loops for a practical yet stylish detail.", Price = 950, Category = "Accessories", ImageURL = "https://i.ibb.co/6JbRPwPZ/photo-32-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },
            new Product { Name = "Shadow Bucket Hat", Description = "Wide-brim bucket hat in a faded obsidian wash with raw-cut edges. The perfect accessory to complete an effortless, dark-streetwear look.", Price = 1450, Category = "Accessories", ImageURL = "https://i.ibb.co/fzmJ87jb/photo-33-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() },
            new Product { Name = "Cyber Link Ring", Description = "Minimalist steel ring with a digital-inspired link pattern. Hand-polished for a mirror-like finish that catches the light beautifully.", Price = 800, Category = "Accessories", ImageURL = "https://i.ibb.co/PGrfmVnJ/photo-34-2026-03-24-16-48-12.png", Sizes = GetDefaultSizes() }
        };

        // --- ФИНАЛЬНЫЙ ШАГ ---
        await _context.Products.AddRangeAsync(opiumDrop);
        await _context.SaveChangesAsync();
    }
}



        

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors("AllowReactApp");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
