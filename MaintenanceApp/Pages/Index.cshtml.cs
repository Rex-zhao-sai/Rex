using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using MaintenanceApp.Models;
using MaintenanceApp.Services;

namespace MaintenanceApp.Pages
{
    public class IndexModel : PageModel
    {
        private readonly SupabaseService _supabase;

        public IndexModel(SupabaseService supabase)
        {
            _supabase = supabase;
        }

        public List<EquipmentWithStatus> EquipmentWithStatus { get; set; } = new();
        public int TotalCount { get; set; }
        public int CompletedCount { get; set; }
        public int ProgressPercent { get; set; }
        public string CurrentRole { get; set; } = "operator";

        public async Task<IActionResult> OnGetAsync()
        {
            CurrentRole = HttpContext.Session.GetString("Role") ?? "operator";
            var month = DateTime.Now.ToString("yyyy-MM");

            var equipment = await _supabase.GetAllEquipmentAsync();
            var records = await _supabase.GetRecordsByMonthAsync(month);

            TotalCount = equipment.Count;
            CompletedCount = records.Count;
            ProgressPercent = TotalCount > 0 ? (CompletedCount * 100 / TotalCount) : 0;

            foreach (var eq in equipment)
            {
                var record = records.FirstOrDefault(r => r.EquipmentId == eq.Id);
                EquipmentWithStatus.Add(new EquipmentWithStatus
                {
                    Equipment = eq,
                    Record = record,
                    IsCompleted = record != null
                });
            }

            return Page();
        }
    }

    public class EquipmentWithStatus
    {
        public Equipment Equipment { get; set; } = new();
        public MaintenanceRecord? Record { get; set; }
        public bool IsCompleted { get; set; }
    }
}
