using System;
using System.Collections.Generic;
using Newtonsoft.Json;

namespace MaintenanceApp.Models
{
    public class Equipment
    {
        [JsonProperty("id")]
        public string Id { get; set; } = string.Empty;

        [JsonProperty("name")]
        public string Name { get; set; } = string.Empty;

        [JsonProperty("created_at")]
        public DateTime CreatedAt { get; set; }
    }

    public class PhotoPair
    {
        [JsonProperty("id")]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [JsonProperty("before")]
        public string Before { get; set; } = string.Empty;

        [JsonProperty("after")]
        public string After { get; set; } = string.Empty;

        [JsonProperty("beforeTime")]
        public string BeforeTime { get; set; } = string.Empty;

        [JsonProperty("afterTime")]
        public string AfterTime { get; set; } = string.Empty;
    }

    public class MaintenanceRecord
    {
        [JsonProperty("id")]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [JsonProperty("equipment_id")]
        public string EquipmentId { get; set; } = string.Empty;

        [JsonProperty("month")]
        public string Month { get; set; } = string.Empty;

        [JsonProperty("technician")]
        public string Technician { get; set; } = string.Empty;

        [JsonProperty("notes")]
        public string Notes { get; set; } = string.Empty;

        [JsonProperty("photo_pairs")]
        public List<PhotoPair> PhotoPairs { get; set; } = new();

        [JsonProperty("role")]
        public string Role { get; set; } = "operator";

        [JsonProperty("created_at")]
        public DateTime CreatedAt { get; set; }

        [JsonProperty("updated_at")]
        public DateTime UpdatedAt { get; set; }

        // Navigation property (not stored in DB)
        [JsonProperty("equipment")]
        public Equipment? Equipment { get; set; }
    }

    public class Role
    {
        public const string Admin = "admin";
        public const string Operator = "operator";
    }
}
