using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using MaintenanceApp.Models;
using MaintenanceApp.Services;

namespace MaintenanceApp.Pages.Equipment
{
    public class DetailModel : PageModel
    {
        private readonly SupabaseService _supabase;

        public DetailModel(SupabaseService supabase)
        {
            _supabase = supabase;
        }

        public Equipment? Equipment { get; set; }
        public MaintenanceRecord? Record { get; set; }
        public string Month { get; set; } = "";
        public bool ReadOnly { get; set; }

        public async Task<IActionResult> OnGetAsync(string id)
        {
            Equipment = await _supabase.GetEquipmentByIdAsync(id);
            if (Equipment == null) return NotFound();

            Month = DateTime.Now.ToString("yyyy-MM");
            var role = HttpContext.Session.GetString("Role") ?? "operator";

            Record = await _supabase.GetRecordAsync(id, Month);

            // If record was created by admin and current user is operator, set read-only
            if (Record != null && Record.Role == "admin" && role == "operator")
            {
                ReadOnly = true;
            }

            if (Record == null)
            {
                Record = new MaintenanceRecord
                {
                    EquipmentId = id,
                    Month = Month,
                    PhotoPairs = new List<PhotoPair> { new() }
                };
            }

            return Page();
        }
    }
}
