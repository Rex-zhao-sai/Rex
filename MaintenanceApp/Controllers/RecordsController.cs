using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using MaintenanceApp.Models;
using MaintenanceApp.Services;

namespace MaintenanceApp.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RecordsController : ControllerBase
    {
        private readonly SupabaseService _supabase;

        public RecordsController(SupabaseService supabase)
        {
            _supabase = supabase;
        }

        [HttpGet]
        public async Task<ActionResult<List<MaintenanceRecord>>> GetRecords(
            [FromQuery] string? month,
            [FromQuery] string? equipmentId,
            [FromHeader(Name = "x-role")] string? role)
        {
            var records = await _supabase.GetRecordsAsync(month, equipmentId);
            return Ok(new { data = records });
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<MaintenanceRecord>> GetRecord(string id)
        {
            // Search by equipment_id and month
            var parts = id.Split('|');
            if (parts.Length != 2)
                return BadRequest(new { error = "无效的ID格式，应为 equipment_id|month" });

            var record = await _supabase.GetRecordAsync(parts[0], parts[1]);
            if (record == null) return NotFound(new { error = "记录未找到" });
            return Ok(new { data = record });
        }

        [HttpPost]
        public async Task<ActionResult<MaintenanceRecord>> Create(
            [FromBody] MaintenanceRecord record,
            [FromHeader(Name = "x-role")] string? role)
        {
            if (string.IsNullOrWhiteSpace(record.EquipmentId) || string.IsNullOrWhiteSpace(record.Month))
                return BadRequest(new { error = "设备ID和月份不能为空" });

            // Check if record already exists
            var existing = await _supabase.GetRecordAsync(record.EquipmentId, record.Month);
            if (existing != null)
            {
                // Operator can only append photo pairs, not modify existing data
                if (role == "operator" && existing.Role == "admin")
                    return BadRequest(new { error = "管理端创建的记录，操作端只能查看" });

                // Append photo pairs
                existing.PhotoPairs.AddRange(record.PhotoPairs);
                if (!string.IsNullOrWhiteSpace(record.Technician))
                    existing.Technician = record.Technician;
                if (!string.IsNullOrWhiteSpace(record.Notes))
                    existing.Notes = record.Notes;

                var updated = await _supabase.UpdateRecordAsync(existing);
                return Ok(new { data = updated });
            }

            record.Role = role ?? "operator";
            var created = await _supabase.CreateRecordAsync(record);
            return CreatedAtAction(nameof(GetRecords), new { data = created });
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<MaintenanceRecord>> Update(
            string id,
            [FromBody] MaintenanceRecord record,
            [FromHeader(Name = "x-role")] string? role)
        {
            if (role != "admin")
                return Forbid();

            record.Id = id;
            var updated = await _supabase.UpdateRecordAsync(record);
            return Ok(new { data = updated });
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> Delete(string id, [FromHeader(Name = "x-role")] string? role)
        {
            if (role != "admin")
                return Forbid();

            await _supabase.DeleteRecordAsync(id);
            return Ok(new { message = "删除成功" });
        }
    }
}
