using UglyToad.PdfPig;
using System.Text;

namespace ResumeAnalyser.API.Services;

public interface IPdfService
{
    Task<string> ExtractTextAsync(IFormFile file);
}

public class PdfService : IPdfService
{
    public async Task<string> ExtractTextAsync(IFormFile file)
    {
        if (file == null || file.Length == 0)
            throw new ArgumentException("Dosya bulunamadı.");

        if (!file.FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("Sadece PDF destekleniyor.");

        if (file.Length > 10 * 1024 * 1024)
            throw new ArgumentException("Dosya 10MB'dan büyük olamaz.");

        using var memoryStream = new MemoryStream();
        await file.CopyToAsync(memoryStream);
        memoryStream.Position = 0;

        var sb = new StringBuilder();
        using var document = PdfDocument.Open(memoryStream);
        foreach (var page in document.GetPages())
            sb.AppendLine(page.Text);

        var text = sb.ToString().Trim();
        if (string.IsNullOrWhiteSpace(text))
            throw new InvalidOperationException("PDF'ten metin çıkarılamadı. Taranmış görsel PDF olabilir.");

        return text;
    }
}