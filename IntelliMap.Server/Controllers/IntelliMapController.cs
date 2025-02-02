using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using System.Security.AccessControl;
using static IntelliMap.Server.AiService;

namespace IntelliMap.Server.Controllers
{
    [ApiController]
    [Route("api/")]
    public class IntelliMapController : ControllerBase
    {
        private readonly ILogger<IntelliMapController> _logger;
        private readonly IMemoryCache _cache;
        private AiService _aiService;

        public IntelliMapController(ILogger<IntelliMapController> logger, IMemoryCache cache, AiService aiService)
        {
            _logger = logger;
            _cache = cache;
            _aiService = aiService;
        }

        [HttpPost("firstProfile")]
        public async Task<IActionResult> ProcessFirstProfile([FromBody] FirstProfile profile)
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
            AskType ask = AskType.MentalAnswer;
            var aiResponse = await _aiService.AskAI(profile.UserId, profile.EventDesc, profile.Answer, ask);
            return Ok(aiResponse);
        }

        [HttpPost("updateMap")]
        public async Task<IActionResult> UpdateMap([FromBody] MapUpdate mapUpdate)
        {
            if (mapUpdate == null)
            {
                _logger.LogWarning("Received null MapUpdate request");
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
                _logger.LogInformation("userId: {UserId}", mapUpdate.UserId);
                _logger.LogInformation("eventDesc: {EventDesc}", mapUpdate.newDesc);
                _logger.LogInformation("answer: {Answer}", mapUpdate.actionsTaken);
                _logger.LogInformation("Processing firstProfile request");
            }
            _logger.LogInformation("firstProfile request processed successfully");

            _cache.Set(mapUpdate.UserId, mapUpdate, TimeSpan.FromMinutes(10));
            AskType ask = AskType.ActionTaken;
            var aiResponse = await _aiService.AskAI(mapUpdate.UserId, mapUpdate.newDesc, mapUpdate.actionsTaken, ask);
            return Ok(aiResponse);
        }
    }
}

