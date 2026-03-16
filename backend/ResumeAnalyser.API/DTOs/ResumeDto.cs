namespace ResumeAnalyser.API.DTOs;

public class AnalyseResponse
{
    public ResumeProfile Profile { get; set; } = new();
    public List<JobMatch> JobMatches { get; set; } = new();
    public List<string> MissingSkills { get; set; } = new();
    public List<string> AtsImprovements { get; set; } = new();
    public int AtsScore { get; set; }
    public string Summary { get; set; } = string.Empty;
}

public class ResumeProfile
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public int YearsOfExperience { get; set; }
    public List<string> Skills { get; set; } = new();
    public List<string> Languages { get; set; } = new();
    public List<WorkExperience> WorkHistory { get; set; } = new();
    public List<Education> Education { get; set; } = new();
}

public class WorkExperience
{
    public string Company { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Duration { get; set; } = string.Empty;
}

public class Education
{
    public string Institution { get; set; } = string.Empty;
    public string Degree { get; set; } = string.Empty;
    public string Year { get; set; } = string.Empty;
}

public class JobMatch
{
    public string Title { get; set; } = string.Empty;
    public string Company { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string Salary { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public int MatchScore { get; set; }
    public List<string> MatchedSkills { get; set; } = new();
    public string Description { get; set; } = string.Empty;
}

public class ClaudeAnalysisResult
{
    public ResumeProfile Profile { get; set; } = new();
    public List<string> MissingSkills { get; set; } = new();
    public List<string> AtsImprovements { get; set; } = new();
    public int AtsScore { get; set; }
    public string Summary { get; set; } = string.Empty;
    public List<string> SearchKeywords { get; set; } = new();
}
public class UploadFileRequest
{
    public IFormFile File { get; set; } = null!;
}