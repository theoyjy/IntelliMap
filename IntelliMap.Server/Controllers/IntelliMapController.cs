using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using System.Security.AccessControl;

namespace IntelliMap.Server.Controllers
{
    [ApiController]
    [Route("api/firstProfile")]
    public class IntelliMapController : ControllerBase
    {
        private readonly ILogger<IntelliMapController> _logger;
        private readonly IMemoryCache _cache;

        public IntelliMapController(ILogger<IntelliMapController> logger, IMemoryCache cache)
        {
            _logger = logger;
            _cache = cache;
        }

        [HttpPost]
        public IActionResult ProcessFirstProfile([FromBody] Profile profile)
        {
            if (profile == null)
            {
                _logger.LogWarning("Received null firstProfile request");
                return BadRequest(new
                {
                    code = 1,
                    data = new object(),
                    message = "Invalid request"
                });
            }

            using (_logger.BeginScope("firstProfile"))
            {
                _logger.LogInformation("Received firstProfile request");
                _logger.LogInformation("userId: {UserId}", profile.UserId);
                _logger.LogInformation("eventDesc: {EventDesc}", profile.EventDesc);
                _logger.LogInformation("answer: {Answer}", profile.Answer);
                _logger.LogInformation("Processing firstProfile request");
            }
            _logger.LogInformation("firstProfile request processed successfully");

            _cache.Set(profile.UserId, profile, TimeSpan.FromMinutes(10));

            var response = new
            {
                code = 0,  // 成功
                data = new
                {
                    defAct = "Surrender",
                    preRes = new
                    {
                        des = "Prison",
                        prob = 1.00
                    }
                },
                msg = "Request processed successfully"
            };

            return Ok(response);
        }

    }
}
