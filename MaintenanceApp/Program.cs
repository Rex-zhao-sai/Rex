using MaintenanceApp.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddRazorPages();
builder.Services.AddControllers();
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromHours(8);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
});

// Register Supabase service
var supabaseUrl = builder.Configuration["Supabase:Url"] 
    ?? Environment.GetEnvironmentVariable("SUPABASE_URL_CUSTOM")
    ?? "https://cpkqoubbwjvchbmdsish.supabase.co";
var supabaseKey = builder.Configuration["Supabase:AnonKey"]
    ?? Environment.GetEnvironmentVariable("SUPABASE_ANON_KEY_CUSTOM")
    ?? "";

builder.Services.AddSingleton(new SupabaseService(supabaseUrl, supabaseKey));

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseSession();
app.MapRazorPages();
app.MapControllers();

app.Run();
