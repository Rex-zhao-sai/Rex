using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using MaintenanceApp.Models;
using MaintenanceApp.Services;

namespace MaintenanceApp.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EquipmentController : ControllerBase
    {
        private readonly SupabaseService _supabase;

        public EquipmentController(SupabaseService supabase)
        {
            _supabase = supabase;
        }

        [HttpGet]
        public async Task<ActionResult<List<Equipment>>> GetAll()
        {
            var equipment = await _supabase.GetEquipmentAsync();
            return Ok(new { data = equipment });
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Equipment>> GetById(string id)
        {
            var equipment = await _supabase.GetEquipmentByIdAsync(id);
            if (equipment == null) return NotFound(new { error = "设备未找到" });
            return Ok(new { data = equipment });
        }

        [HttpPost]
        public async Task<ActionResult<Equipment>> Create([FromBody] CreateEquipmentRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest(new { error = "设备名称不能为空" });

            var equipment = await _supabase.CreateEquipmentAsync(request.Name);
            return CreatedAtAction(nameof(GetById), new { id = equipment.Id }, new { data = equipment });
        }

        [HttpPost("seed")]
        public async Task<ActionResult> Seed()
        {
            await _supabase.SeedEquipmentAsync();
            return Ok(new { message = "设备数据初始化完成" });
        }
    }

    public class CreateEquipmentRequest
    {
        public string Name { get; set; } = string.Empty;
    }
}
