using System.Text;
using System.Text.Json;
using ResumeAnalyser.API.DTOs;

namespace ResumeAnalyser.API.Services;

public interface IClaudeService
{
    Task<ClaudeAnalysisResult> AnalyseResumeAsync(string resumeText);
}

public class ClaudeService : IClaudeService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _config;
    private readonly ILogger<ClaudeService> _logger;

    public ClaudeService(HttpClient httpClient, IConfiguration config, ILogger<ClaudeService> logger)
    {
        _httpClient = httpClient;
        _config = config;
        _logger = logger;
    }

    public async Task<ClaudeAnalysisResult> AnalyseResumeAsync(string resumeText)
    {
        var apiKey = _config["Groq:ApiKey"] ?? throw new InvalidOperationException("Groq API key eksik.");

        var prompt = "You are an expert CV/Resume analyst. Analyse the resume below and return ONLY a valid JSON object, no markdown, no explanation.\n\n"
            + "RESUME:\n---\n"
            + resumeText
            + "\n---\n\n"
            + "Return this exact JSON structure:\n"
            + "{\n"
            + "  \"profile\": {\n"
            + "    \"name\": \"\",\n"
            + "    \"email\": \"\",\n"
            + "    \"phone\": \"\",\n"
            + "    \"title\": \"\",\n"
            + "    \"yearsOfExperience\": 0,\n"
            + "    \"skills\": [],\n"
            + "    \"languages\": [],\n"
            + "    \"workHistory\": [{\"company\": \"\", \"role\": \"\", \"duration\": \"\"}],\n"
            + "    \"education\": [{\"institution\": \"\", \"degree\": \"\", \"year\": \"\"}]\n"
            + "  },\n"
            + "  \"missingSkills\": [],\n"
            + "  \"atsImprovements\": [],\n"
            + "  \"atsScore\": 0,\n"
            + "  \"summary\": \"\",\n"
            + "  \"searchKeywords\": []\n"
            + "}";

        var requestBody = new
        {
            model = "llama-3.3-70b-versatile",
            messages = new[]
            {
                new { role = "system", content = "You are a CV analyst. Always respond with valid JSON only, no markdown, no explanation." },
                new { role = "user", content = prompt }
            },
            temperature = 0.1,
            max_tokens = 4096,
            response_format = new { type = "json_object" }
        };

        var request = new HttpRequestMessage(HttpMethod.Post, "https://api.groq.com/openai/v1/chat/completions");
        request.Headers.Add("Authorization", $"Bearer {apiKey}");
        request.Content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

        var response = await _httpClient.SendAsync(request);
        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"Groq API hatası: {response.StatusCode} - {responseBody}");

        using var doc = JsonDocument.Parse(responseBody);
        var content = doc.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString() ?? throw new InvalidOperationException("Groq boş yanıt döndü.");

        var json = content.Trim();
        if (json.StartsWith("```json")) json = json.Substring(7);
        else if (json.StartsWith("```")) json = json.Substring(3);
        if (json.EndsWith("```")) json = json.Substring(0, json.LastIndexOf("```"));
        json = json.Trim();

        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        return JsonSerializer.Deserialize<ClaudeAnalysisResult>(json, options)
            ?? throw new InvalidOperationException("Groq yanıtı parse edilemedi.");
    }
}