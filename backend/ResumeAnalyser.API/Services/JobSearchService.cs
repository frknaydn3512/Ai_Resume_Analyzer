using System.Text.Json;
using ResumeAnalyser.API.DTOs;

namespace ResumeAnalyser.API.Services;

public interface IJobSearchService
{
    Task<List<JobMatch>> SearchJobsAsync(List<string> keywords, List<string> skills);
}

public class JobSearchService : IJobSearchService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _config;
    private readonly ILogger<JobSearchService> _logger;

    public JobSearchService(HttpClient httpClient, IConfiguration config, ILogger<JobSearchService> logger)
    {
        _httpClient = httpClient;
        _config = config;
        _logger = logger;
    }

    public async Task<List<JobMatch>> SearchJobsAsync(List<string> keywords, List<string> skills)
    {
        
        var appId = _config["Adzuna:AppId"];
        var apiKey = _config["Adzuna:ApiKey"];
        var country = _config["Adzuna:Country"] ?? "us";
       
        if (string.IsNullOrEmpty(appId) || appId == "YOUR_ADZUNA_APP_ID")
            return GetMockJobs(keywords, skills);

        try
        {
            var query = Uri.EscapeDataString(string.Join(" ", keywords.Take(3)));
            var url = $"https://api.adzuna.com/v1/api/jobs/{country}/search/1?app_id={appId}&app_key={apiKey}&what={query}&results_per_page=8&content-type=application/json";

            var response = await _httpClient.GetAsync(url);
            if (!response.IsSuccessStatusCode) return GetMockJobs(keywords, skills);

            var bytes = await response.Content.ReadAsByteArrayAsync();
            var body = System.Text.Encoding.UTF8.GetString(bytes);

            using var doc = JsonDocument.Parse(body);
            var results = doc.RootElement.GetProperty("results");
            var jobs = new List<JobMatch>();

            foreach (var job in results.EnumerateArray())
            {
                var title = job.TryGetProperty("title", out var t) ? t.GetString() ?? "" : "";
                var company = job.TryGetProperty("company", out var c) && c.TryGetProperty("display_name", out var cn) ? cn.GetString() ?? "" : "";
                var location = job.TryGetProperty("location", out var l) && l.TryGetProperty("display_name", out var ld) ? ld.GetString() ?? "" : "";
                var description = job.TryGetProperty("description", out var d) ? d.GetString() ?? "" : "";
                var jobUrl = job.TryGetProperty("redirect_url", out var u) ? u.GetString() ?? "" : "";
                var salaryMin = job.TryGetProperty("salary_min", out var sm) ? sm.GetDecimal() : 0;
                var salaryMax = job.TryGetProperty("salary_max", out var sx) ? sx.GetDecimal() : 0;
                var salary = salaryMin > 0 ? $"£{salaryMin:N0}" + (salaryMax > 0 ? $" - £{salaryMax:N0}" : "+") : "Belirtilmemiş";

                var matched = skills.Where(s =>
                    description.Contains(s, StringComparison.OrdinalIgnoreCase) ||
                    title.Contains(s, StringComparison.OrdinalIgnoreCase)).Take(6).ToList();

                jobs.Add(new JobMatch
                {
                    Title = title,
                    Company = company,
                    Location = location,
                    Salary = salary,
                    Url = jobUrl,
                    Description = description.Length > 200 ? description[..200] + "..." : description,
                    MatchedSkills = matched,
                    MatchScore = 40 + (skills.Count > 0 ? (int)((double)matched.Count / skills.Count * 45) : 0) + new Random().Next(5, 15)
                });
            }

            return jobs.OrderByDescending(j => j.MatchScore).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Adzuna API hatası");
            return GetMockJobs(keywords, skills);
        }
    }

    private List<JobMatch> GetMockJobs(List<string> keywords, List<string> skills)
    {
        var kw = keywords.FirstOrDefault() ?? "Developer";
        return new List<JobMatch>
        {
            new() { Title = $"Senior {kw}", Company = "TechCorp", Location = "İstanbul", Salary = "₺80.000 - ₺120.000", Url = "#", MatchedSkills = skills.Take(4).ToList(), MatchScore = 92, Description = $"Deneyimli {kw} arıyoruz..." },
            new() { Title = $"{kw} Engineer", Company = "StartupXYZ", Location = "Remote", Salary = "₺60.000 - ₺80.000", Url = "#", MatchedSkills = skills.Take(3).ToList(), MatchScore = 84, Description = "Hızlı büyüyen ekibimize katıl..." },
            new() { Title = $"Lead {kw}", Company = "Enterprise A.Ş.", Location = "Ankara", Salary = "₺100.000+", Url = "#", MatchedSkills = skills.Take(5).ToList(), MatchScore = 76, Description = "5 kişilik ekibe liderlik edecek..." },
            new() { Title = $"Junior {kw}", Company = "Digital Ajans", Location = "İzmir", Salary = "₺35.000 - ₺45.000", Url = "#", MatchedSkills = skills.Take(2).ToList(), MatchScore = 65, Description = "Kariyerine başlamak için harika fırsat..." },
        };
    }
}