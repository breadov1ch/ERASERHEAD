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
builder.Services.AddScoped<EmailService>();
builder.Services.AddScoped<WayForPayService>();

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
    var _context = services.GetRequiredService<MyDbContext>();

    try
    {
        await _context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Products"" ADD COLUMN IF NOT EXISTS ""Images"" text[] DEFAULT ARRAY[]::text[];");
        await _context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Products"" ADD COLUMN IF NOT EXISTS ""Silhouette"" text DEFAULT 'OVERSIZED';");
        await _context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Products"" ADD COLUMN IF NOT EXISTS ""Fabric"" text DEFAULT '100% COTTON';");
        await _context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Products"" ADD COLUMN IF NOT EXISTS ""SizeChartJson"" text;");
        await _context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Products"" ADD COLUMN IF NOT EXISTS ""ColorsJson"" text;");
        await _context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Products"" ADD COLUMN IF NOT EXISTS ""IsPreOrder"" boolean DEFAULT false;");
        await _context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Products"" ADD COLUMN IF NOT EXISTS ""Gender"" text DEFAULT 'Unisex';");
        await _context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""CartItems"" ADD COLUMN IF NOT EXISTS ""Color"" text DEFAULT '';");
        await _context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""OrderItems"" ADD COLUMN IF NOT EXISTS ""Color"" text DEFAULT '';");
        await _context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Clients"" ADD COLUMN IF NOT EXISTS ""AvatarUrl"" text DEFAULT 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80';");
        await _context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Clients"" ADD COLUMN IF NOT EXISTS ""ResetCode"" text;");
        await _context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Clients"" ADD COLUMN IF NOT EXISTS ""ResetCodeExpiry"" timestamp with time zone;");
        await _context.Database.ExecuteSqlRawAsync(@"UPDATE ""Clients"" SET ""RefreshTokenExpiryTime"" = NOW() + INTERVAL '60 days' WHERE ""RefreshToken"" IS NOT NULL AND ""RefreshTokenExpiryTime"" < NOW() + INTERVAL '30 days';");
        await _context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Orders"" ADD COLUMN IF NOT EXISTS ""Carrier"" text DEFAULT 'Nova Poshta';");
        await _context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Orders"" ADD COLUMN IF NOT EXISTS ""DeliveryType"" text DEFAULT 'Warehouse';");
        await _context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Orders"" ADD COLUMN IF NOT EXISTS ""DeliveryBranch"" text;");
        await _context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Orders"" ADD COLUMN IF NOT EXISTS ""DeliveryCity"" text;");
        await _context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Orders"" ADD COLUMN IF NOT EXISTS ""DeliveryCost"" numeric DEFAULT 0;");
        await _context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Orders"" ADD COLUMN IF NOT EXISTS ""PromoCode"" text;");
        await _context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Orders"" ADD COLUMN IF NOT EXISTS ""DiscountSum"" numeric DEFAULT 0;");
        await _context.Database.ExecuteSqlRawAsync(@"CREATE TABLE IF NOT EXISTS ""PromoCodes"" (
            ""Id"" serial PRIMARY KEY,
            ""Code"" text NOT NULL,
            ""DiscountPercent"" numeric NOT NULL DEFAULT 0,
            ""DiscountAmount"" numeric NOT NULL DEFAULT 0,
            ""MinOrderSum"" numeric NOT NULL DEFAULT 0,
            ""IsActive"" boolean NOT NULL DEFAULT true,
            ""ExpiryDate"" timestamp with time zone,
            ""UsageCount"" integer NOT NULL DEFAULT 0,
            ""MaxUsages"" integer,
            ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT NOW()
        );");
        // Обновление цены тестового предзаказа шапки с 10 грн на 450 грн и категории Headwear
        await _context.Database.ExecuteSqlRawAsync(@"UPDATE ""Products"" SET ""Price"" = 450 WHERE ""Id"" = 277 AND ""Price"" = 10;");
        await _context.Database.ExecuteSqlRawAsync(@"UPDATE ""Products"" SET ""Category"" = 'Headwear' WHERE ""Id"" = 277 OR ""Name"" ILIKE '%Hat%' OR ""Name"" ILIKE '%Cap%' OR ""Name"" ILIKE '%Beanie%' OR ""Name"" ILIKE '%Шапка%';");
        // Удаление устаревших черновиков/неоплаченных заказов старше 1 дня
        await _context.Database.ExecuteSqlRawAsync(@"DELETE FROM ""Orders"" WHERE (""Status"" = 'Draft' OR ""Status"" = 'Pending') AND ""DateOfIssuance"" < NOW() - INTERVAL '1 day';");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"DB Schema migration notice: {ex.Message}");
    }

    // Инициализация/обновление администратора olga0669368037@gmail.com
    try
    {
        var targetEmail = "olga0669368037@gmail.com";
        var userRecord = await _context.Clients.FirstOrDefaultAsync(c => c.Email.ToLower() == targetEmail);
        if (userRecord != null)
        {
            if (userRecord.Role != "Admin")
            {
                userRecord.Role = "Admin";
                await _context.SaveChangesAsync();
                Console.WriteLine($"[AUTH_INIT] Account {targetEmail} upgraded to Admin.");
            }
        }
        else
        {
            var adminUser = new Client
            {
                Name = "Olga",
                Email = targetEmail,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!"),
                Role = "Admin",
                AvatarUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80"
            };
            await _context.Clients.AddAsync(adminUser);
            await _context.SaveChangesAsync();
            Console.WriteLine($"[AUTH_INIT] Admin account created for {targetEmail} with password 'Admin123!'.");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[AUTH_INIT] Error ensuring admin: {ex.Message}");
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
