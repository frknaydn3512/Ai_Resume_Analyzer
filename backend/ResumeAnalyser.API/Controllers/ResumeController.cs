using Microsoft.AspNetCore.Mvc;
using ResumeAnalyser.API.DTOs;
using ResumeAnalyser.API.Services;

namespace ResumeAnalyser.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ResumeController : ControllerBase
{
    private readonly IPdfService _pdfService;
    private readonly IClaudeService _claudeService;
    private readonly IJobSearchService _jobSearchService;
    private readonly ILogger<ResumeController> _logger;

    public ResumeController(IPdfService pdfService, IClaudeService claudeService,
        IJobSearchService jobSearchService, ILogger<ResumeController> logger)
    {
        _pdfService = pdfService;
        _claudeService = claudeService;
        _jobSearchService = jobSearchService;
        _logger = logger;
    }

    [HttpPost("analyse")]
    [RequestSizeLimit(10_000_000)]
    public async Task<ActionResult<AnalyseResponse>> Analyse([FromForm] UploadFileRequest request)
    {
        try
        {
            var resumeText = await _pdfService.ExtractTextAsync(request.File);
            var analysis = await _claudeService.AnalyseResumeAsync(resumeText);
            var jobs = await _jobSearchService.SearchJobsAsync(analysis.SearchKeywords, analysis.Profile.Skills);

            return Ok(new AnalyseResponse
            {
                Profile = analysis.Profile,
                JobMatches = jobs,
                MissingSkills = analysis.MissingSkills,
                AtsImprovements = analysis.AtsImprovements,
                AtsScore = analysis.AtsScore,
                Summary = analysis.Summary
            });
        }
        catch (ArgumentException ex) { return BadRequest(new { error = ex.Message }); }
        catch (InvalidOperationException ex) { return UnprocessableEntity(new { error = ex.Message }); }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Hata");
            return StatusCode(500, new { error = "Beklenmeyen hata oluştu." });
        }
    }

    [HttpGet("health")]
    public IActionResult Health() => Ok(new { status = "ok" });
}