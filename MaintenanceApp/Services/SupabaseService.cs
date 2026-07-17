using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using MaintenanceApp.Models;
using Newtonsoft.Json;

namespace MaintenanceApp.Services
{
    public class SupabaseService
    {
        private readonly HttpClient _httpClient;
        private readonly string _url;
        private readonly string _anonKey;

        public SupabaseService(IConfiguration configuration)
        {
            _url = configuration["Supabase:Url"] ?? throw new InvalidOperationException("Supabase:Url not configured");
            _anonKey = configuration["Supabase:AnonKey"] ?? throw new InvalidOperationException("Supabase:AnonKey not configured");

            _httpClient = new HttpClient();
            _httpClient.DefaultRequestHeaders.Add("apikey", _anonKey);
            _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {_anonKey}");
            _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        }

        // Equipment
        public async Task<List<Equipment>> GetEquipmentAsync()
        {
            var response = await _httpClient.GetAsync($"{_url}/rest/v1/equipment?select=*&order=name.asc");
            response.EnsureSuccessStatusCode();
            var json = await response.Content.ReadAsStringAsync();
            return JsonConvert.DeserializeObject<List<Equipment>>(json) ?? new();
        }

        public async Task<Equipment?> GetEquipmentByIdAsync(string id)
        {
            var response = await _httpClient.GetAsync($"{_url}/rest/v1/equipment?id=eq.{id}&select=*");
            response.EnsureSuccessStatusCode();
            var json = await response.Content.ReadAsStringAsync();
            var list = JsonConvert.DeserializeObject<List<Equipment>>(json);
            return list?.Count > 0 ? list[0] : null;
        }

        public async Task<Equipment> CreateEquipmentAsync(string name)
        {
            var slug = GenerateSlug(name);
            var equipment = new Equipment { Id = slug, Name = name, CreatedAt = DateTime.UtcNow };
            var json = JsonConvert.SerializeObject(equipment);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync($"{_url}/rest/v1/equipment", content);
            response.EnsureSuccessStatusCode();
            return equipment;
        }

        // Maintenance Records
        public async Task<List<MaintenanceRecord>> GetRecordsAsync(string? month = null, string? equipmentId = null)
        {
            var queryParams = new List<string> { "select=*,equipment(id,name)" };

            if (!string.IsNullOrEmpty(month))
                queryParams.Add($"month=eq.{month}");
            if (!string.IsNullOrEmpty(equipmentId))
                queryParams.Add($"equipment_id=eq.{equipmentId}");

            queryParams.Add("order=created_at.desc");

            var response = await _httpClient.GetAsync($"{_url}/rest/v1/maintenance_records?{string.Join("&", queryParams)}");
            response.EnsureSuccessStatusCode();
            var json = await response.Content.ReadAsStringAsync();
            return JsonConvert.DeserializeObject<List<MaintenanceRecord>>(json) ?? new();
        }

        public async Task<MaintenanceRecord?> GetRecordAsync(string equipmentId, string month)
        {
            var response = await _httpClient.GetAsync($"{_url}/rest/v1/maintenance_records?equipment_id=eq.{equipmentId}&month=eq.{month}&select=*,equipment(id,name)");
            response.EnsureSuccessStatusCode();
            var json = await response.Content.ReadAsStringAsync();
            var list = JsonConvert.DeserializeObject<List<MaintenanceRecord>>(json);
            return list?.Count > 0 ? list[0] : null;
        }

        public async Task<MaintenanceRecord> CreateRecordAsync(MaintenanceRecord record)
        {
            record.CreatedAt = DateTime.UtcNow;
            record.UpdatedAt = DateTime.UtcNow;
            var json = JsonConvert.SerializeObject(record);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync($"{_url}/rest/v1/maintenance_records", content);
            response.EnsureSuccessStatusCode();
            return record;
        }

        public async Task<MaintenanceRecord> UpdateRecordAsync(MaintenanceRecord record)
        {
            record.UpdatedAt = DateTime.UtcNow;
            var json = JsonConvert.SerializeObject(record);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PatchAsync($"{_url}/rest/v1/maintenance_records?id=eq.{record.Id}", content);
            response.EnsureSuccessStatusCode();
            return record;
        }

        public async Task DeleteRecordAsync(string id)
        {
            var response = await _httpClient.DeleteAsync($"{_url}/rest/v1/maintenance_records?id=eq.{id}");
            response.EnsureSuccessStatusCode();
        }

        // Seed equipment data
        public async Task SeedEquipmentAsync()
        {
            var existing = await GetEquipmentAsync();
            if (existing.Count > 0) return;

            var equipmentList = new List<(string Id, string Name)>
            {
                ("tkp-ict", "TKP ICT"), ("tkp-per-fct", "TKP PER-FCT"), ("tkp-hot-epe", "TKP HOT-EPE"),
                ("tkp-eol", "TKP EOL"), ("tkp-run-in", "TKP run in"),
                ("bs3g-ict", "BS3G ICT"), ("bs3g-epe", "BS3G EPE"),
                ("infolight", "Infolight"), ("dmi-epe", "DMI EPE"), ("dmi-ict", "DMI ICT"),
                ("zkw1050-mcl-epe", "ZKW1050 MCL EPE"), ("zkw1060-mcl-1", "ZKW1060 MCL-1"),
                ("zkw1060-mcl-2", "ZKW1060 MCL-2"), ("zkw1295", "ZKW1295"), ("zkw1271", "ZKW1271"),
                ("zkw1296-base-r", "ZKW1296-Base R"), ("zkw1296-base-l", "ZKW1296-Base L"),
                ("zkw1296-sa-l", "ZKW1296-SA L"), ("zkw1296-sa-r", "ZKW1296-SA R"),
                ("zkw1296-corner-light", "ZKW1296-Corner-Light"), ("zkw1296-citg-light", "ZKW1296-Citg-Light"),
                ("zkw1105-led", "ZKW1105 LED"),
                ("zkw1050lwr-1105-lwr-epe", "ZKW1050LWR/1105 LWR EPE"),
                ("zkw1050lwr-1105-lwr-ict", "ZKW1050LWR/1105 LWR ICT"),
                ("zkw1261", "ZKW1261"), ("zkw1251-1213", "ZKW1251&1213"), ("zkw1108", "ZKW1108"),
                ("pem6-epe", "PEM6 EPE"), ("pem6-ict", "PEM6 ICT"),
                ("pumu-ict", "PUMU ICT"), ("pumu-prog", "PUMU PROG"),
                ("pumu-1", "PUMU 1"), ("pumu-2", "PUMU 2"),
                ("hsu-osu-1", "HSU-OSU 1"), ("hsu-osu-2", "HSU-OSU 2"),
                ("hsu-osu-run-in", "HSU-OSU run in"),
                ("hsu-cu-epe", "HSU-CU EPE"), ("hsu-cu-ict", "HSU-CU ICT"),
                ("hsu-cu-prog", "HSU-CU PROG"), ("hsu-cu-run-in", "HSU-CU run in"),
                ("mraii-ict", "MRAII ICT"), ("mraii-1", "MRAII-1"), ("mraii-2", "MRAII-2"),
                ("vw-neo", "VW Neo"),
                ("shwp1223-epe", "SHWP1223 EPE"), ("shwp1223-ict", "SHWP1223 ICT"),
                ("cpm-ad1-0-epe", "CPM_AD1.0 EPE"), ("cpm-ad1-0-ict", "CPM_AD1.0 ICT"),
                ("cpm-ad1g5-epe", "CPM_AD1G5 EPE"), ("cpm-ad1g5-ict", "CPM_AD1G5 ICT"),
                ("adm-du-g2-ict", "ADM_DU_G2 ICT"), ("adm-du-g2-epe", "ADM_DU_G2 EPE"),
                ("adm-du-g2-prog", "ADM_DU_G2 PROG"),
                ("adm-aau-epe", "ADM_AAU EPE"), ("adm-aau-ict", "ADM_AAU ICT"),
                ("316", "316"),
                ("aero-b-epe", "Aero B EPE"), ("aero-b-ict", "Aero B ICT"),
                ("g4x-ict", "G4X ICT"), ("g4x-epe", "G4X EPE"),
                ("alfmeier-vw491", "Alfmeier VW491"),
                ("schaeffler-476-1", "Schaeffler 476-1"), ("schaeffler-476-2", "Schaeffler 476-2"),
                ("schaeffler-476-ict", "Schaeffler 476 ICT"),
                ("lotus-reae-seat-epe", "Lotus/Reae seat EPE"),
                ("lotus-ict", "Lotus ICT"), ("reae-seat-ict", "Reae seat ICT"),
                ("pem52-ict", "PEM52 ICT"), ("gem-6-ict", "Gem.6 ICT"),
                ("gen-6-plasma-workcell", "Gen.6 Plasma Workcell"),
                ("gen-6-set-workcell", "Gen.6 SET Workcell"),
                ("gen-6-run-in", "Gen.6-run in"),
                ("zkw1176epe", "ZKW1176EPE"), ("zkw1176-ict", "ZKW1176 ICT"),
                ("gen-5epe", "Gen.5EPE"), ("gen-5-ict", "Gen.5 ICT"),
                ("eop-1-ict", "EOP-1 ICT"), ("eop-1", "EOP-1"),
                ("eop-2-ict", "EOP-2 ICT"), ("eop-2", "EOP-2"),
                ("eop-run-in", "eop-run in"),
                ("wet-eop-ict", "Wet-EOP ICT"), ("wet-eop", "Wet-EOP"),
                ("wet-eop-run-in", "Wet-EOP run in")
            };

            foreach (var (id, name) in equipmentList)
            {
                var equipment = new Equipment { Id = id, Name = name, CreatedAt = DateTime.UtcNow };
                var json = JsonConvert.SerializeObject(equipment);
                var content = new StringContent(json, Encoding.UTF8, "application/json");
                await _httpClient.PostAsync($"{_url}/rest/v1/equipment", content);
            }
        }

        private static string GenerateSlug(string name)
        {
            return name.ToLower()
                .Replace(" ", "-")
                .Replace("/", "-")
                .Replace("&", "")
                .Replace(".", "")
                .Replace("_", "-");
        }
    }
}
