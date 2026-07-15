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
            // --- PANTS ---
            new Product { Name = "Sterling Chain Flare", Description = "Flared denim adorned with integrated silver chains and metallic hardware. The ultimate piece for a high-fashion, rock-inspired outfit.", Price = 5600, Category = "Pants", ImageURL = "https://i.ibb.co/355qgMJQ/STERLING-CHAIN-FLARE.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Midnight Flare Denim", Description = "Classic midnight blue denim with an extreme flared leg and raw edges. The deep color provides a versatile base for any dark outfit.", Price = 4200, Category = "Pants", ImageURL = "https://i.ibb.co/PsjZWsyJ/MIDNIGHT-RAW-FLARE.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Raw Carbon Baggy", Description = "Matte black baggy jeans with a stiff, raw carbon-like finish. Engineered for maximum volume and a sharp, architectural silhouette.", Price = 4700, Category = "Pants", ImageURL = "https://i.ibb.co/7L9RYY1/RAW-CARBON-ARCHITECT.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Phantom Stitched Hybrid", Description = "A technical windbreaker hybrid pants style with tonal stitching and a matte finish. Features articulated joints for full range of motion.", Price = 4900, Category = "Pants", ImageURL = "https://i.ibb.co/V0TrnHV5/PHANTOM-STITCHED-HYBRID.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Obsidian Field Pants", Description = "Military-inspired field trousers updated with a modern, dark-minimalist twist. Multiple hidden compartments provide discrete storage.", Price = 4600, Category = "Pants", ImageURL = "https://i.ibb.co/QjYFmTK9/OBSIDIAN-FIELD-PANTS.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Glitch Patterned Cargo", Description = "Longline cargo trousers featuring an all-over digital glitch pattern and metallic accents. Engineered for a distinct silhouette.", Price = 5100, Category = "Pants", ImageURL = "https://i.ibb.co/Pzjkg0qM/GLITCH-PATTERNED-CARGO.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Hardware Biker Stacks", Description = "Heavyweight biker denim with custom hardware and a deeply stacked silhouette. A timeless piece that defines the cyber-grunge look.", Price = 5400, Category = "Pants", ImageURL = "https://i.ibb.co/PfzDGpV/HARDWARE-BIKER-STACKS.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Void Walker Transit Pants", Description = "Technical transit pants with adjustable straps and a breathable lining. Designed for a sleek, futuristic aesthetic during urban movement.", Price = 4800, Category = "Pants", ImageURL = "https://i.ibb.co/5tSSC6d/VOID-WALKER-TRANSIT-PANTS.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Shadow Washed Wide-Leg", Description = "Wide-brim fluid silhouette denim in a faded obsidian wash with raw-cut edges. The perfect piece to complete an effortless streetwear look.", Price = 4500, Category = "Pants", ImageURL = "https://i.ibb.co/6RjyG0X4/SHADOW-WASHED-WIDE-LEG.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Cyber Tapered Denim", Description = "Minimalist raw denim with a digital-inspired structural taper. Engineered for modern high-fashion aesthetics.", Price = 4300, Category = "Pants", ImageURL = "https://i.ibb.co/d4D2VjhC/CYBER-TAPERED-DENIM.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Abyss Multi-Pocket System", Description = "Reinforced tactical pockets combined with high-density distressed cotton fabric. Features adjustable leg straps for an industrial fit.", Price = 5200, Category = "Pants", ImageURL = "https://i.ibb.co/3yzTDZFJ/ABYSS-MULTI-POCKET-SYSTEM.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Acid-Etched Boxy Jeans", Description = "Heavy cotton denim treated with a custom acid wash for a gritty texture. Features dropped shoulders and a cropped, boxy fit.", Price = 4400, Category = "Pants", ImageURL = "https://i.ibb.co/nNFB88bx/ACID-ETCHED-BOXY-JEANS.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Cinder Insulated Cargo", Description = "High-loft insulation encased in a distressed, ash-toned fabric. Provides extreme warmth without sacrificing the grunge-forward look.", Price = 5500, Category = "Pants", ImageURL = "https://i.ibb.co/TxtBdP8V/CINDER-INSULATED-CARGO.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Graphite Oxide Flare", Description = "Extra-long inseam denim designed to stack naturally. Treated with a unique graphite-oxide wash for a metallic sheen.", Price = 4700, Category = "Pants", ImageURL = "https://i.ibb.co/9kvPTm0L/GRAPHITE-OXIDE-FLARE.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Grid Overlock Trousers", Description = "Breathable tech fabric with contrast overlock stitching details. Perfectly suited for complex avant-garde layering outfits.", Price = 4100, Category = "Pants", ImageURL = "https://i.ibb.co/DgSphy3H/GRID-OVERLOCK-TROUSERS.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Hardware-Accented Flare", Description = "Handcrafted custom flared denim with polished chrome hardware closures. Adds a sharp, industrial edge to any dark outfit.", Price = 4900, Category = "Pants", ImageURL = "https://i.ibb.co/08vvM6M/HARDWARE-ACCENTED-FLARE.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Obsidian Layered Cargo", Description = "Dual-layered cargo design featuring raw edges and exposed tactical pockets. A signature piece for the ultimate dark-minimalist look.", Price = 5300, Category = "Pants", ImageURL = "https://i.ibb.co/PRYD4vJ/OBSIDIAN-LAYERED-CARGO.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Onyx Nylon-Paneled Denim", Description = "Boxy-fit structured denim with a custom matte nylon paneling finish. Detailed with hidden security utility pockets.", Price = 4800, Category = "Pants", ImageURL = "https://i.ibb.co/HDXpdmYd/ONYX-NYLON-PANELED-DENIM.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Phantom Modular Trousers", Description = "Modular trouser system featuring laser-cut lines. Offers multiple storage options for an aggressive techwear aesthetic.", Price = 5100, Category = "Pants", ImageURL = "https://i.ibb.co/8LsnhDvj/PHANTOM-MODULAR-TROUSERS.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Selvedge Stacked Flare", Description = "Japanese selvedge denim featuring a signature multi-stack flared silhouette. The deep black wash creates a sleek, high-fashion profile.", Price = 4900, Category = "Pants", ImageURL = "https://i.ibb.co/dw3ngPFd/SELVEDGE-STACKED-FLARE.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Titanium Tech-Shell Pants", Description = "Water-resistant tech shell with articulated lines and metallic hardware zippers. A core piece for navigating the harsh urban landscape.", Price = 5400, Category = "Pants", ImageURL = "https://i.ibb.co/Jwf1XBKs/TITANIUM-TECH-SHELL-PANTS.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Vandal Stacked Denim", Description = "Premium heavyweight structural denim with digital hardware prints. Engineered for an extreme stacked silhouette and raw aesthetic.", Price = 5200, Category = "Pants", ImageURL = "https://i.ibb.co/CNZ91Fg/VANDAL-STACKED-DENIM.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Void Magnetic Baggy", Description = "Minimalist carry-focused baggy denim with integrated utility loops and magnetic buckle lines. Designed for seamless integration.", Price = 4600, Category = "Pants", ImageURL = "https://i.ibb.co/p6DVgqgd/VOID-MAGNETIC-BAGGY.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Web-Link Utility Denim", Description = "Constructed from military-grade webbing threads and heavy-duty steel hardware accents. Gives a clean mechanical touch.", Price = 4800, Category = "Pants", ImageURL = "https://i.ibb.co/cS9sk5SG/WEB-LINK-UTILITY-DENIM.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Oxidized Chain Trousers", Description = "Heavy-gauge steel chains integrated with an oxidized finish for a vintage feel. Attached securely to premium tailored denim.", Price = 4900, Category = "Pants", ImageURL = "https://i.ibb.co/8gPn3Lgw/OXIDIZED-CHAIN-TROUSERS.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Static Print Denim", Description = "Premium cotton denim with a digital noise print and raw-cut elements. The loose fit ensures maximum comfort and a relaxed vibe.", Price = 4500, Category = "Pants", ImageURL = "https://i.ibb.co/Jw4wqqqT/STATIC-PRINT-DENIM.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Intarsia Knit Denim", Description = "Intarsia knit structural panel denim with a distorted pattern and frayed edges. A statement piece that bridges luxury and grunge.", Price = 5100, Category = "Pants", ImageURL = "https://i.ibb.co/XfFP7dP3/INTARSIA-KNIT-DENIM.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Echo Shredded Jeans", Description = "Lightweight custom processed denim featuring subtle bleach splatters and hand-shredded details. Perfect for adding high contrast texture.", Price = 4600, Category = "Pants", ImageURL = "https://i.ibb.co/prZR085Y/ECHO-SHREDDED-JEANS.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Industrial Patina Flare", Description = "Jeans featuring a unique dark-tinted wash inspired by industrial rust. Each pair is hand-finished for a one-of-a-kind wear pattern.", Price = 4800, Category = "Pants", ImageURL = "https://i.ibb.co/GZBW8vy/INDUSTRIAL-PATINA-FLARE.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Void Splatter Baggy", Description = "High-contrast bleach splatters on a deep dark background create a stunning visual. The relaxed baggy fit offers an aggressive look.", Price = 4700, Category = "Pants", ImageURL = "https://i.ibb.co/hR9drzzY/VOID-SPLATTER-BAGGY.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Structural Wide-Leg", Description = "Extreme wide-leg pants for a dramatic silhouette and high-fashion impact.剧 Crafted from structured denim that holds its shape perfectly.", Price = 4900, Category = "Pants", ImageURL = "https://i.ibb.co/CsmPjRqn/STRUCTURAL-WIDE-LEG.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Carbon Weave Denim", Description = "Textured denim designed to mimic the weave of technical carbon fiber material. Highly durable and finished with a subtle matte luster.", Price = 4600, Category = "Pants", ImageURL = "https://i.ibb.co/G3TD2NdL/CARBON-WEAVE-DENIM.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Ash Semi-Sheer Pants", Description = "Ultra-lightweight structural trousers with a smoky, semi-transparent layered texture. Features adjustable drawstrings for utility.", Price = 4200, Category = "Pants", ImageURL = "https://i.ibb.co/5WGdnwbt/ASH-SEMI-SHEER-PANTS.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Vortex Embroidered Jeans", Description = "Structured heavy denim with a custom vortex embroidery design elements. A clean yet aggressive piece for complete outfit synergy.", Price = 4800, Category = "Pants", ImageURL = "https://i.ibb.co/rRkXs1ps/VORTEX-EMBROIDERED-JEANS.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Chrome-Trim Biker Denim", Description = "Classic biker silhouette updated with silver metallic accents, padding and chains. Heavy-duty denim ensures structured stacks.", Price = 5300, Category = "Pants", ImageURL = "https://i.ibb.co/67vjc7pC/CHROME-TRIM-BIKER-DENIM.web", Sizes = GetDefaultSizes() },
            new Product { Name = "Waxed Cotton Mac-Pants", Description = "An avant-garde structural pants layout with oversized utility lines. Made from a heavy cotton twill with a premium waxed finish.", Price = 4900, Category = "Pants", ImageURL = "https://i.ibb.co/kRPB8Bt/WAXED-COTTON-MAC-PANTS.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Static Knit Trousers", Description = "Extra-long heavy tailored trousers featuring a distorted static noise weave pattern. Provides both extreme comfort and visual depth.", Price = 4500, Category = "Pants", ImageURL = "https://i.ibb.co/QvZCNYVm/STATIC-KNIT-TROUSERS.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Titanium Buckle Slim", Description = "Heavy structured slim-fit trousers made from polished industrial-grade cotton mixes. Features a secure heavy technical buckle closure.", Price = 4400, Category = "Pants", ImageURL = "https://i.ibb.co/Sw3t8qLr/TITANIUM-BUCKLE-SLIM.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Ghost Embroidered Jeans", Description = "Distressed deep black denim with raw edges and an embroidered tonal 'ghost' graphic matrix. The signature relaxed drape fits perfectly.", Price = 4700, Category = "Pants", ImageURL = "https://i.ibb.co/dJVV1RZ4/GHOST-EMBROIDERED-JEANS.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Matte Obsidian Trousers", Description = "Minimalist heavy structural trousers made from premium matte obsidian fabrics. Features multiple internal card slots and discrete lines.", Price = 4600, Category = "Pants", ImageURL = "https://i.ibb.co/tPNr13WW/MATTE-OBSIDIAN-TROUSERS.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Iridescent Neon Flare", Description = "Slim-fit denim treated with subtle oil-slick reflections and neon structural edge highlights. Gives a sharp body-hugging flare profile.", Price = 4900, Category = "Pants", ImageURL = "https://i.ibb.co/Z6sNLbNg/IRIDESCENT-NEON-FLARE.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Tech-Mesh Cargo System", Description = "Sheer tech-mesh and tactical nylon paneled cargo layout designed for experimental layering. Features multiple zip compartments.", Price = 5200, Category = "Pants", ImageURL = "https://i.ibb.co/kVX6WYGy/TECH-MESH-CARGO-SYSTEM.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Vandal Graffiti Baggy", Description = "Oversized heavy-duty denim featuring a distorted street-art graffiti layer on the front. Made from premium rigid structural fabrics.", Price = 5100, Category = "Pants", ImageURL = "https://i.ibb.co/Mx4vkcBZ/VANDAL-GRAFFITI-BAGGY.webp", Sizes = GetDefaultSizes() },

            // --- ACCESSORIES ---
            new Product { Name = "Silver Studded Bracelet", Description = "Handcrafted industrial leather bracelet adorned with raw silver hardware studs and secure mechanical buckle system.", Price = 1650, Category = "Accessories", ImageURL = "https://i.ibb.co/4w1N1QtF/SILVER-STUDDED-BRACELET.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Tactical Chest Rig", Description = "Modular tactical vest rig system featuring high-density laser-cut layouts. Provides custom storage lines for complete utility look.", Price = 5800, Category = "Accessories", ImageURL = "https://i.ibb.co/xSXR94Cb/TACTICAL-CHEST-RIG.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Void Mesh Mask", Description = "Technical face mask with adjustable straps and a breathable technical mesh layer. Designed for an aggressive avant-garde aesthetic.", Price = 1200, Category = "Accessories", ImageURL = "https://i.ibb.co/yFWktqvd/VOID-MESH-MASK.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Carbon Fiber Cardholder", Description = "Minimalist tactical wallet sleeve crafted from genuine woven carbon fiber material. Ultra lightweight, highly durable structure.", Price = 1200, Category = "Accessories", ImageURL = "https://i.ibb.co/vxqL75Cb/CARBON-FIBER-CARDHOLDER.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Chrome Link Chain", Description = "Heavy-gauge steel chain with a deeply oxidized finish for an industrial look. Can be worn as a necklace or attached directly to denim.", Price = 1900, Category = "Accessories", ImageURL = "https://i.ibb.co/1t2YzDJc/CHROME-LINK-CHAIN.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Core Balaclava", Description = "Heavyweight thermal knit balaclava with aggressive minimalist opening cuts. Engineered to hold shape and structure under severe conditions.", Price = 2200, Category = "Accessories", ImageURL = "https://i.ibb.co/PsRSw5Yp/CORE-BALACLAVA.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Industrial Utility Belt", Description = "Constructed from heavy military-grade webbing and industrial steel quick-release hardware. The perfect finish for stacked bottoms.", Price = 1800, Category = "Accessories", ImageURL = "https://i.ibb.co/Nd4wYPnj/INDUSTRIAL-UTILITY-BELT.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Obsidian Crossbody Bag", Description = "Minimalist carry system with a waterproof exterior matrix and custom magnetic buckles. Built seamlessly for daily high-fashion storage.", Price = 2400, Category = "Accessories", ImageURL = "https://i.ibb.co/mrGPcx0r/OBSIDIAN-CROSSBODY-BAG.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Opti-Shield Eyewear", Description = "Futuristic angular sunglasses with solid dark lenses and heavy composite wrap-around frames. Full wind protection and tech aesthetic.", Price = 2900, Category = "Accessories", ImageURL = "https://i.ibb.co/SwkcxY5k/OPTI-SHIELD-EYEWEAR.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Phantom Beanie", Description = "Distressed heavy knit beanie with rough edges, dropped threads, and deep crown setup. Provides a reliable industrial frame.", Price = 1450, Category = "Accessories", ImageURL = "https://i.ibb.co/0j9VZY0V/PHANTOM-BEANIE.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Reinforced Gloves", Description = "Ergonomic technical gloves with synthetic panels, tactile grip overlays, and reinforced knuckle protections. Pure functional techwear look.", Price = 2100, Category = "Accessories", ImageURL = "https://i.ibb.co/m5YSbCp8/REINFORCED-GLOVES.webp", Sizes = GetDefaultSizes() },

            // --- OUTERWEAR ---
            new Product { Name = "Phantom Down Jacket", Description = "High-loft technical insulation encased in a multi-paneled tactical layout. Extreme warmth profile and deep avant-garde hood frame.", Price = 8200, Category = "Outerwear", ImageURL = "https://i.ibb.co/RkHQSbvy/PHANTOM-DOWN-JACKET.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Static Hooded Jacket", Description = "Heavyweight fleece zip-up hoodie featuring aggressive distressing and a deep, oversized hood layout. Faded textured tone structure.", Price = 4200, Category = "Outerwear", ImageURL = "https://i.ibb.co/qFRR25P8/STATIC-HOODED-JACKET.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Titanium Parka", Description = "Water-resistant matte tech shell with articulated oversized sleeves and military metal zippers. Built to survive brutal urban architecture.", Price = 7800, Category = "Outerwear", ImageURL = "https://i.ibb.co/xqGssK3t/TITANIUM-PARKA.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Void Waxed Coat", Description = "Heavyweight structural trench jacket layout with deep side utility pockets. Crafted using industrial grade premium waxed cotton twill fabric.", Price = 8900, Category = "Outerwear", ImageURL = "https://i.ibb.co/0pLGgKnp/VOID-WAXED-COAT.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Vortex Puffer Jacket", Description = "Insulated cropped puffer jacket utilizing custom micro-rib panels and an intense matte black shell surface. Offers extreme thermal control.", Price = 8500, Category = "Outerwear", ImageURL = "https://i.ibb.co/k6HMQnGz/VORTEX-PUFFER-JACKET.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Architect Wind Breaker", Description = "Ultra-lightweight high-density windbreaker with technical geometric seams. Features fully adjustable structural drawstrings.", Price = 5100, Category = "Outerwear", ImageURL = "https://i.ibb.co/L4wPJ4h/ARCHITECT-WIND-BREAKER.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Carbon Shell Anorak", Description = "Premium technical anorak layout utilizing deep center pockets and structural zip collars. Material layer treated with weather coatings.", Price = 6200, Category = "Outerwear", ImageURL = "https://i.ibb.co/wNJvvMD9/CARBON-SHELL-ANORAK.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Chrome Tech Blazer", Description = "Sharp angular formal blazer redesigned with tech elements, industrial metal hooks, and custom internal gear straps.", Price = 6800, Category = "Outerwear", ImageURL = "https://i.ibb.co/5ZPSwy9/CHROME-TECH-BLAZER.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Cinder Cropped Bomber", Description = "Boxy cropped aviator jacket silhouette with a heavily washed structural texture finish. Detailed with heavy-duty elastic rib edges.", Price = 6500, Category = "Outerwear", ImageURL = "https://i.ibb.co/ds71BdHt/CINDER-CROPPED-BOMBER.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Industrial Biker Jacket", Description = "Premium asymmetrical cut motorcycle jacket with multiple industrial metal zippers and heavy distressed textures along the leather frame.", Price = 9500, Category = "Outerwear", ImageURL = "https://i.ibb.co/qY496mWm/INDUSTRIAL-BIKER-JACKET.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Obsidian Vest", Description = "Streamlined gilet style core vest layout featuring technical hidden internal slots and industrial geometric panel linings.", Price = 4900, Category = "Outerwear", ImageURL = "https://i.ibb.co/W8jZFWM/OBSIDIAN-VEST.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Onyx Field Shell", Description = "Weatherproof shell system with deep front field utility compartments and modular velcro attachments. Sharp minimalist fit lines.", Price = 7100, Category = "Outerwear", ImageURL = "https://i.ibb.co/dJksm7JK/ONYX-FIELD-SHELL.webp", Sizes = GetDefaultSizes() },

            // --- TOPS ---
            new Product { Name = "Vandal Oversized Tee", Description = "Premium heavyweight structural cotton jersey with distressed custom edge details. Built for a perfect high-fashion wide frame drape.", Price = 2800, Category = "Tops", ImageURL = "https://i.ibb.co/kgk2Tq1Z/VANDAL-OVERSIZED-TEE.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Void Logo Tee", Description = "Core essential drop-shoulder tee featuring a subtly distorted rubberized brand print on the center chest area. Premium heavy weight fabric.", Price = 2600, Category = "Tops", ImageURL = "https://i.ibb.co/LdLvt9QH/VOID-LOGO-TEE.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Vortex Graphic T-Shirt", Description = "Oversized graphic shirt displaying custom surrealist art elements across the entire back panel. Distressed neckline edges.", Price = 2950, Category = "Tops", ImageURL = "https://i.ibb.co/0yZ3gdMY/VORTEX-GRAPHIC-T-SHIRT.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Architect Box Tee", Description = "Clean, boxy, heavily cropped t-shirt with signature architectural center back seams. Keeps its wide geometric structure flawlessly.", Price = 2700, Category = "Tops", ImageURL = "https://i.ibb.co/XZ5vcMRj/ARCHITECT-BOX-TEE.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Cinder Washed Tee", Description = "Faded vintage black tee constructed from high-grade cotton jersey. Underwent specialized stone enzyme washing for maximum softness.", Price = 2850, Category = "Tops", ImageURL = "https://i.ibb.co/75pwctV/CINDER-WASHED-TEE.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Echo Distressed Top", Description = "Lightweight custom processed long-sleeve knit shirt featuring intricate hand-distressed holes along the hems and sleeves.", Price = 3100, Category = "Tops", ImageURL = "https://i.ibb.co/BKs5SNK1/ECHO-DISTRESSED-TOP.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Industrial Logo Top", Description = "Relaxed fit jersey top featuring bold mechanical typography graphics along both sleeves. Perfect piece for layered technical outfits.", Price = 3200, Category = "Tops", ImageURL = "https://i.ibb.co/QFgRZPG0/INDUSTRIAL-LOGO-TOP.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Onyx Layered Tee", Description = "Pre-layered style long shirt option combining a relaxed short-sleeve exterior over tight textured waffle-knit thermal underarms.", Price = 3400, Category = "Tops", ImageURL = "https://i.ibb.co/2f5NzW8/ONYX-LAYERED-TEE.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Phantom Mesh Top", Description = "Avant-garde semi-sheer mesh technical top with clean flatlock exposed stitching. Engineered as a core base element for dark outfits.", Price = 2900, Category = "Tops", ImageURL = "https://i.ibb.co/fzwjD9YH/PHANTOM-MESH-TOP.webp", Sizes = GetDefaultSizes() },
            new Product { Name = "Static Noise T-Shirt", Description = "Premium heavyweight cotton top detailed with an intricate abstract digital gray noise visual print structure across all sides.", Price = 2750, Category = "Tops", ImageURL = "https://i.ibb.co/Mx6JKjd2/STATIC-NOISE-T-SHIRT.webp", Sizes = GetDefaultSizes() }
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
