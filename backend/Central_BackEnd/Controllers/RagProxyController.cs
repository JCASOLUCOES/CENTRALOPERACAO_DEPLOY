using Central_BackEnd.Models;
using Central_BackEnd.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Central_BackEnd.Controllers;

[ApiController]
[Route("api/rag-proxy")]
[Authorize]
public class RagProxyController : ControllerBase
{
    private readonly IRagProxyService _ragProxyService;

    public RagProxyController(IRagProxyService ragProxyService)
    {
        _ragProxyService = ragProxyService;
    }

    [HttpPost("chat")]
    public async Task<ActionResult<RagChatResponse>> Chat([FromBody] RagChatRequest request)
    {
        var response = await _ragProxyService.ChatAsync(request);
        return Ok(response);
    }
}