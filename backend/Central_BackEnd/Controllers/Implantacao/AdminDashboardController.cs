using Asp.Versioning;
using Central_BackEnd.Dtos.Implantacao;
using Central_BackEnd.Services.Implantacao;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Central_BackEnd.Controllers.Implantacao;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/admin/dashboard")]
[Authorize(Roles = "Administrador")]
public class AdminDashboardController : ControllerBase
{
    private readonly IAdminDashboardService _service;
    public AdminDashboardController(IAdminDashboardService service) { _service = service; }

    [HttpGet]
    public async Task<ActionResult<AdminDashboardDto>> Obter(
        [FromQuery] int? funcaoId = null,
        [FromQuery] int? diasRetro = 7,
        CancellationToken ct = default)
        => Ok(await _service.ObterAsync(funcaoId, diasRetro, ct));
}