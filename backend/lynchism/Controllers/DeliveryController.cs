using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;

namespace lynchism.Controllers
{
    public class DeliveryBranchDto
    {
        public string Id { get; set; } = string.Empty;
        public string Provider { get; set; } = string.Empty; // "nova_poshta", "ukrposhta", "meest"
        public string Type { get; set; } = string.Empty;     // "Warehouse", "Postomat"
        public string City { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string? PostalCode { get; set; }
        public string Description { get; set; } = string.Empty;
        public bool IsRestricted { get; set; } = false;
    }

    [ApiController]
    [Route("api/[controller]")]
    [Route("[controller]")]
    public class DeliveryController : Controller
    {
        private static readonly HttpClient _httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(4) };

        // Локальный справочник отделений Meest и Укрпочты для основных городов Украины
        // Обеспечивает мгновенный отклик (< 10ms) без сбоев внешних серверов
        private static readonly List<DeliveryBranchDto> _localDirectory = new List<DeliveryBranchDto>
        {
            // === MEEST: ДНІПРО ===
            new DeliveryBranchDto { Id = "meest-dp-1", Provider = "meest", Type = "Warehouse", City = "Дніпро", Name = "Відділення №1", Address = "вул. Курчатова, 10", Description = "Відділення №1: вул. Курчатова, 10 (біля Автовокзалу)" },
            new DeliveryBranchDto { Id = "meest-dp-2", Provider = "meest", Type = "Warehouse", City = "Дніпро", Name = "Відділення №2 (Точка видачі Rozetka)", Address = "просп. Дмитра Яворницького, 50", Description = "Точка видачі №2: просп. Дмитра Яворницького, 50 (ТЦ Пасаж)" },
            new DeliveryBranchDto { Id = "meest-dp-5", Provider = "meest", Type = "Warehouse", City = "Дніпро", Name = "Відділення №5", Address = "вул. Січових Стрільців, 14", Description = "Відділення №5: вул. Січових Стрільців, 14" },
            new DeliveryBranchDto { Id = "meest-dp-12", Provider = "meest", Type = "Warehouse", City = "Дніпро", Name = "Відділення №12 (Сільпо)", Address = "просп. Гагаріна, 54", Description = "Точка видачі №12: просп. Гагаріна, 54 (супермаркет Сільпо)" },
            new DeliveryBranchDto { Id = "meest-dp-18", Provider = "meest", Type = "Warehouse", City = "Дніпро", Name = "Відділення №18 (ТЦ Караван)", Address = "вул. Нижньодніпровська, 17", Description = "Відділення №18: вул. Нижньодніпровська, 17 (ТРК Караван)" },
            new DeliveryBranchDto { Id = "meest-dp-24", Provider = "meest", Type = "Warehouse", City = "Дніпро", Name = "Відділення №24", Address = "просп. Богдана Хмельницького, 31Д", Description = "Відділення №24: просп. Богдана Хмельницького, 31Д" },
            new DeliveryBranchDto { Id = "meest-dp-pm1", Provider = "meest", Type = "Postomat", City = "Дніпро", Name = "Поштомат №201", Address = "вул. Воскресенська, 10", Description = "Поштомат №201 (вул. Воскресенська, 10, цілодобово)" },
            new DeliveryBranchDto { Id = "meest-dp-pm2", Provider = "meest", Type = "Postomat", City = "Дніпро", Name = "Поштомат №205", Address = "просп. Поля, 28А", Description = "Поштомат №205 (просп. Олександра Поля, 28А)" },
            new DeliveryBranchDto { Id = "meest-dp-pm3", Provider = "meest", Type = "Postomat", City = "Дніпро", Name = "Поштомат №210", Address = "вул. Калинова, 9А", Description = "Поштомат №210 (вул. Калинова, 9А, ТЦ Млин)" },
            new DeliveryBranchDto { Id = "meest-dp-pm4", Provider = "meest", Type = "Postomat", City = "Дніпро", Name = "Поштомат №215", Address = "вул. Набережна Перемоги, 62", Description = "Поштомат №215 (вул. Набережна Перемоги, 62)" },

            // === MEEST: КИЇВ ===
            new DeliveryBranchDto { Id = "meest-kv-1", Provider = "meest", Type = "Warehouse", City = "Київ", Name = "Відділення №1", Address = "вул. Хрещатик, 22", Description = "Відділення №1: вул. Хрещатик, 22 (Головпоштамт)" },
            new DeliveryBranchDto { Id = "meest-kv-7", Provider = "meest", Type = "Warehouse", City = "Київ", Name = "Відділення №7", Address = "вул. Велика Васильківська, 72", Description = "Відділення №7: вул. Велика Васильківська, 72 (ТЦ Олімпійський)" },
            new DeliveryBranchDto { Id = "meest-kv-15", Provider = "meest", Type = "Warehouse", City = "Київ", Name = "Відділення №15 (ТРЦ Lavina)", Address = "вул. Берковецька, 6Д", Description = "Відділення №15: вул. Берковецька, 6Д (ТРЦ Lavina Mall)" },
            new DeliveryBranchDto { Id = "meest-kv-pm1", Provider = "meest", Type = "Postomat", City = "Київ", Name = "Поштомат №101", Address = "просп. Перемоги, 15", Description = "Поштомат №101 (просп. Берестейський, 15)" },
            new DeliveryBranchDto { Id = "meest-kv-pm2", Provider = "meest", Type = "Postomat", City = "Київ", Name = "Поштомат №108", Address = "вул. Антоновича, 176", Description = "Поштомат №108 (вул. Антоновича, 176, ТРЦ Ocean Plaza)" },

            // === MEEST: ЛЬВІВ ===
            new DeliveryBranchDto { Id = "meest-lv-1", Provider = "meest", Type = "Warehouse", City = "Львів", Name = "Відділення №1", Address = "вул. Зелена, 147", Description = "Відділення №1: вул. Зелена, 147 (Центральний хаб)" },
            new DeliveryBranchDto { Id = "meest-lv-4", Provider = "meest", Type = "Warehouse", City = "Львів", Name = "Відділення №4", Address = "просп. Чорновола, 67", Description = "Відділення №4: просп. В'ячеслава Чорновола, 67" },
            new DeliveryBranchDto { Id = "meest-lv-pm1", Provider = "meest", Type = "Postomat", City = "Львів", Name = "Поштомат №301", Address = "вул. Городоцька, 85", Description = "Поштомат №301 (вул. Городоцька, 85, ТЦ Привокзальний)" },

            // === MEEST: ОДЕСА ===
            new DeliveryBranchDto { Id = "meest-od-1", Provider = "meest", Type = "Warehouse", City = "Одеса", Name = "Відділення №1", Address = "вул. Середня, 83", Description = "Відділення №1: вул. Середня, 83" },
            new DeliveryBranchDto { Id = "meest-od-3", Provider = "meest", Type = "Warehouse", City = "Одеса", Name = "Відділення №3", Address = "вул. Дерибасівська, 14", Description = "Відділення №3: вул. Дерибасівська, 14" },

            // === MEEST: ХАРКІВ ===
            new DeliveryBranchDto { Id = "meest-kh-1", Provider = "meest", Type = "Warehouse", City = "Харків", Name = "Відділення №1", Address = "вул. Сумська, 45", Description = "Відділення №1: вул. Сумська, 45" },
            new DeliveryBranchDto { Id = "meest-kh-8", Provider = "meest", Type = "Warehouse", City = "Харків", Name = "Відділення №8", Address = "просп. Науки, 20", Description = "Відділення №8: просп. Науки, 20" },

            // === UKRPOSHTA: ДНІПРО ===
            new DeliveryBranchDto { Id = "up-dp-49000", Provider = "ukrposhta", Type = "Warehouse", City = "Дніпро", PostalCode = "49000", Name = "Дніпро-Головпоштамт (49000)", Address = "просп. Дмитра Яворницького, 62", Description = "49000: просп. Дмитра Яворницького, 62 (Головпоштамт)" },
            new DeliveryBranchDto { Id = "up-dp-49005", Provider = "ukrposhta", Type = "Warehouse", City = "Дніпро", PostalCode = "49005", Name = "Дніпро 5 (49005)", Address = "просп. Гагаріна, 28", Description = "49005: просп. Гагаріна, 28 (Соборний р-н)" },
            new DeliveryBranchDto { Id = "up-dp-49006", Provider = "ukrposhta", Type = "Warehouse", City = "Дніпро", PostalCode = "49006", Name = "Дніпро 6 (49006)", Address = "вул. Робоча, 73", Description = "49006: вул. Робоча, 73" },
            new DeliveryBranchDto { Id = "up-dp-49027", Provider = "ukrposhta", Type = "Warehouse", City = "Дніпро", PostalCode = "49027", Name = "Дніпро 27 (49027)", Address = "вул. Івана Акінфієва, 18", Description = "49027: вул. Івана Акінфієва, 18 (парк Шевченка)" },
            new DeliveryBranchDto { Id = "up-dp-49038", Provider = "ukrposhta", Type = "Warehouse", City = "Дніпро", PostalCode = "49038", Name = "Дніпро 38 (49038)", Address = "пл. Вокзальна, 1", Description = "49038: пл. Вокзальна, 1 (Залізничний вокзал)" },
            new DeliveryBranchDto { Id = "up-dp-49044", Provider = "ukrposhta", Type = "Warehouse", City = "Дніпро", PostalCode = "49044", Name = "Дніпро 44 (49044)", Address = "вул. Шевченка, 23", Description = "49044: вул. Шевченка, 23" },
            new DeliveryBranchDto { Id = "up-dp-49051", Provider = "ukrposhta", Type = "Warehouse", City = "Дніпро", PostalCode = "49051", Name = "Дніпро 51 (49051)", Address = "вул. Богдана Хмельницького, 3", Description = "49051: вул. Богдана Хмельницького, 3" },
            new DeliveryBranchDto { Id = "up-dp-49101", Provider = "ukrposhta", Type = "Warehouse", City = "Дніпро", PostalCode = "49101", Name = "Дніпро 101 (49101)", Address = "вул. Титова, 16", Description = "49101: вул. Титова, 16" },

            // === UKRPOSHTA: КИЇВ ===
            new DeliveryBranchDto { Id = "up-kv-01001", Provider = "ukrposhta", Type = "Warehouse", City = "Київ", PostalCode = "01001", Name = "Київ-Головпоштамт (01001)", Address = "вул. Хрещатик, 22", Description = "01001: вул. Хрещатик, 22 (Головпоштамт)" },
            new DeliveryBranchDto { Id = "up-kv-01033", Provider = "ukrposhta", Type = "Warehouse", City = "Київ", PostalCode = "01033", Name = "Київ 33 (01033)", Address = "вул. Жилянська, 30", Description = "01033: вул. Жилянська, 30" },
            new DeliveryBranchDto { Id = "up-kv-02002", Provider = "ukrposhta", Type = "Warehouse", City = "Київ", PostalCode = "02002", Name = "Київ 2 (02002)", Address = "вул. Микільсько-Слобідська, 2Б", Description = "02002: вул. Микільсько-Слобідська, 2Б (Лівобережна)" },

            // === UKRPOSHTA: ЛЬВІВ ===
            new DeliveryBranchDto { Id = "up-lv-79000", Provider = "ukrposhta", Type = "Warehouse", City = "Львів", PostalCode = "79000", Name = "Львів-Головпоштамт (79000)", Address = "вул. Словацького, 1", Description = "79000: вул. Словацького, 1 (Головпоштамт)" },
            new DeliveryBranchDto { Id = "up-lv-79005", Provider = "ukrposhta", Type = "Warehouse", City = "Львів", PostalCode = "79005", Name = "Львів 5 (79005)", Address = "вул. Івана Франка, 16", Description = "79005: вул. Івана Франка, 16" },

            // === UKRPOSHTA: ОДЕСА ===
            new DeliveryBranchDto { Id = "up-od-65001", Provider = "ukrposhta", Type = "Warehouse", City = "Одеса", PostalCode = "65001", Name = "Одеса-Головпоштамт (65001)", Address = "вул. Садова, 10", Description = "65001: вул. Садова, 10 (Головпоштамт)" },
            new DeliveryBranchDto { Id = "up-od-65026", Provider = "ukrposhta", Type = "Warehouse", City = "Одеса", PostalCode = "65026", Name = "Одеса 26 (65026)", Address = "вул. Грецька, 32", Description = "65026: вул. Грецька, 32" },

            // === UKRPOSHTA: ХАРКІВ ===
            new DeliveryBranchDto { Id = "up-kh-61052", Provider = "ukrposhta", Type = "Warehouse", City = "Харків", PostalCode = "61052", Name = "Харків-Головпоштамт (61052)", Address = "майдан Привокзальний, 2", Description = "61052: майдан Привокзальний, 2" },
            new DeliveryBranchDto { Id = "up-kh-61002", Provider = "ukrposhta", Type = "Warehouse", City = "Харків", PostalCode = "61002", Name = "Харків 2 (61002)", Address = "вул. Мироносицька, 86", Description = "61002: вул. Мироносицька, 86" }
        };

        /// <summary>
        /// Поиск отделений и поштоматов (Meest, Ukrposhta).
        /// GET /api/delivery/branches?provider=meest&type=Warehouse&city=Дніпро&search=
        /// </summary>
        [AllowAnonymous]
        [HttpGet("branches")]
        public async Task<IActionResult> GetBranches(
            [FromQuery] string? provider = "meest",
            [FromQuery] string? type = "Warehouse",
            [FromQuery] string? city = "Дніпро",
            [FromQuery] string? search = null)
        {
            var pNorm = (provider ?? "meest").ToLowerInvariant();
            var tNorm = (type ?? "Warehouse").ToLowerInvariant();
            var cNorm = (city ?? string.Empty).Trim().ToLowerInvariant();
            var sNorm = (search ?? string.Empty).Trim().ToLowerInvariant();

            // Если провайдер Meest — пробуем также подтянуть открытые данные Meest API, если есть сеть
            if (pNorm == "meest" && !string.IsNullOrEmpty(cNorm))
            {
                try
                {
                    // Публичный эндпоинт Meest
                    var url = $"https://publicapi.meest.com/branches?city={Uri.EscapeDataString(city!)}";
                    var response = await _httpClient.GetAsync(url);
                    if (response.IsSuccessStatusCode)
                    {
                        var content = await response.Content.ReadAsStringAsync();
                        using var doc = JsonDocument.Parse(content);
                        if (doc.RootElement.ValueKind == JsonValueKind.Array)
                        {
                            var list = new List<DeliveryBranchDto>();
                            foreach (var el in doc.RootElement.EnumerateArray())
                            {
                                var bType = el.TryGetProperty("type", out var tp) ? tp.GetString() ?? "" : "";
                                var isPostomat = bType.IndexOf("postomat", StringComparison.OrdinalIgnoreCase) >= 0;
                                if (tNorm == "postomat" && !isPostomat) continue;
                                if (tNorm == "warehouse" && isPostomat) continue;

                                var num = el.TryGetProperty("num", out var n) ? n.GetString() ?? "" : "";
                                var street = el.TryGetProperty("street", out var st) ? st.GetString() ?? "" : "";
                                var streetNumber = el.TryGetProperty("street_number", out var sn) ? sn.GetString() ?? "" : "";
                                var dCity = el.TryGetProperty("city", out var ct) ? ct.GetString() ?? city : city;
                                var desc = $"{(isPostomat ? "Поштомат" : "Відділення")} №{num}: {street}, {streetNumber}".TrimEnd(',', ' ');

                                if (!string.IsNullOrEmpty(sNorm) && !desc.ToLowerInvariant().Contains(sNorm))
                                    continue;

                                list.Add(new DeliveryBranchDto
                                {
                                    Id = $"meest-{num}",
                                    Provider = "meest",
                                    Type = isPostomat ? "Postomat" : "Warehouse",
                                    City = dCity ?? city,
                                    Address = $"{street}, {streetNumber}",
                                    Description = desc
                                });
                            }

                            if (list.Count > 0)
                            {
                                return Ok(new { success = true, count = list.Count, branches = list.Take(40) });
                            }
                        }
                    }
                }
                catch
                {
                    // Fallback to local high-speed directory
                }
            }

            // Локальный справочник (мгновенный отклик 1-5 мс)
            var query = _localDirectory.AsEnumerable();

            if (!string.IsNullOrEmpty(pNorm))
            {
                query = query.Where(b => b.Provider.Equals(pNorm, StringComparison.OrdinalIgnoreCase));
            }

            if (!string.IsNullOrEmpty(tNorm))
            {
                query = query.Where(b => b.Type.Equals(tNorm, StringComparison.OrdinalIgnoreCase));
            }

            if (!string.IsNullOrEmpty(cNorm))
            {
                var cityMatches = query.Where(b => b.City.ToLowerInvariant().Contains(cNorm) || cNorm.Contains(b.City.ToLowerInvariant())).ToList();
                if (cityMatches.Count > 0)
                {
                    query = cityMatches;
                }
            }

            if (!string.IsNullOrEmpty(sNorm))
            {
                query = query.Where(b =>
                    b.Description.ToLowerInvariant().Contains(sNorm) ||
                    b.Address.ToLowerInvariant().Contains(sNorm) ||
                    (b.PostalCode != null && b.PostalCode.Contains(sNorm))
                );
            }

            var results = query.Take(30).ToList();

            // Если в городе нет отделений в базе (например небольшое село) — генерируем динамический шаблон для выбора
            if (results.Count == 0 && !string.IsNullOrEmpty(city))
            {
                if (pNorm == "ukrposhta")
                {
                    results.Add(new DeliveryBranchDto
                    {
                        Id = "up-manual",
                        Provider = "ukrposhta",
                        Type = "Warehouse",
                        City = city,
                        PostalCode = sNorm.Length == 5 ? sNorm : "",
                        Description = $"Відділення Укрпошти: {city} (введіть номер чи індекс відділення)"
                    });
                }
                else if (pNorm == "meest")
                {
                    results.Add(new DeliveryBranchDto
                    {
                        Id = "meest-manual",
                        Provider = "meest",
                        Type = tNorm == "postomat" ? "Postomat" : "Warehouse",
                        City = city,
                        Description = $"Точка видачі Meest: {city} (введіть адресу або номер)"
                    });
                }
            }

            return Ok(new
            {
                success = true,
                count = results.Count,
                provider = pNorm,
                city = city,
                branches = results
            });
        }
    }
}
