using System.Text.Json;
using System.Text;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Caching.Memory;
using IntelliMap.Server.Controllers;
using Microsoft.Extensions.Logging;
using System.Text.RegularExpressions;

namespace IntelliMap.Server
{
    public class FirstProfile
    {
        public required string UserId { get; set; }
        public required string EventDesc { get; set; }
        public required string[] Answer { get; set; }
    };

    public class MapUpdate
    {
        public required string UserId { get; set; }
        public required string newDesc { get; set; }
        public required string[] actionsTaken { get; set; }
    };


    public class MapInformation
    {
        public string userId { get; set; }
        public string questionDesc { get; set; }
        public string mentalProfille { get; set; }
        public string actionsTaken { get; set; }
        public string mentalAnswer { get; set; }
    }

    public class AiService
    {
        private readonly HttpClient _httpClient;
        private readonly IMemoryCache _cache;
        private readonly string _apiKey = "AIzaSyD6Fy8Xg4WwFIjTej_Yuk--QOTHpMJgGFk";
        private readonly ILogger<AiService> _logger;

        public AiService(HttpClient httpClient, IMemoryCache cache, ILogger<AiService> logger)
        {
            _httpClient = httpClient;
            _cache = cache;
            _logger = logger;
        }

        private MapInformation GetMapInformation(string userId)
        {
            if (!_cache.TryGetValue(userId, out MapInformation mapInformation))
            {
                mapInformation = new MapInformation();
                mapInformation.userId = userId;
                _cache.Set(userId, mapInformation, TimeSpan.FromHours(1));
            }
            return mapInformation;
        }

        private MapInformation UpdateMapInformationFromUser(MapInformation mapInformation, string question, string[] list, AskType askType)
        {
            switch (askType)
            {
                case AskType.ActionTaken:
                    {
                        string actionTaken = "User has selected the following actions:";
                        for (int i = 0; i < list.Length; i++)
                        {
                            actionTaken += list[i] + "\r\n";
                        }
                        mapInformation.actionsTaken = actionTaken;

                        if (question != null)
                        {
                            mapInformation.questionDesc += "User add more information for the initial question:" + question + "\r\n";
                        }
                    }
                    break;

                case AskType.MentalAnswer:
                    {
                        string mentalAnswer = "User has taken the following actions:";
                        for (int i = 0; i < list.Length; i++)
                        {
                            mentalAnswer += list[i] + "\r\n";
                        }
                        mapInformation.mentalAnswer = mentalAnswer;

                        mapInformation.questionDesc = "User asks this question:" + question + "\r\n";
                    }
                    break;

            }
            _cache.Set(mapInformation.userId, mapInformation, TimeSpan.FromHours(1));
            return mapInformation;
        }


        private string OrganizeQuestion(MapInformation mapInformation, AskType askType)
        {
            string question = "";
            // initialize question
            if (askType == AskType.MentalAnswer)
            {
                question = "You are an intelligent decision-making assistant. Your task is to:\r\n" +
                "1. Analyze the user's profile based on the provided responses to 10 questions.\r\n" +
                "2. Understand and analyze the user's current problem, using user's description and user profile.\r\n" +
                "3. Generate 3 recommended actions that the user can take to address the issue, each action should be limited to 3 words.\r\n" +
                "4. Assume that the user has taken the most optimal action and predict the 3 most likely outcomes.\r\n" +
                "5. Provide a probability distribution for each predicted outcome (totaling 100%).\r\n" +
                "6. Ensure that your response follows the JSON format. so I can easily parse it:\r\n" +
                "A json object named 'data' contains two list and an attributes, one list named 'actions' contains the 3 most recommended actions, each one is a string, and the more recommened an action is, the lower index it is at." +
                "The other list named 'preRes' contains the 3 most likely predicted results(outcomes), the more likely an outcome is, the lower index it is at. " +
                "Each predicted result is a object that has two attributes: \"des\" for description of the outcome (limited to 30 words) and \"prob\" for probability of the outcome which is a number between 0 to 100" +
                "The last attribute in 'data' is 'mentalProfile' which is a string that describes the core mental features of user.\r\n";

                question += mapInformation.questionDesc;
                question += mapInformation.mentalAnswer;
            }
            else if(askType == AskType.ActionTaken)
            {
                question = "You are an intelligent decision-making assistant. Your task is to:\r\n" +
                "1. Update the user's mental profile based on the profile passed to you and the questions the user asked and actions has taken\r\n" +
                "2. Understand and analyze the user's current problem, using the user's description and user profile.\r\n" +
                "3. Generate 3 recommended actions that the user can take to address the issue, each action should be limited to 3 words.\r\n" +
                "4. Assume that the user has taken the most optimal action and predict the 3 most likely outcomes.\r\n" +
                "5. Provide a probability distribution for each predicted outcome (totaling 100%).\r\n" +
                "6. Ensure that your response follows the standardized JSON format below. No need to include ```json expression, so I can parse them:\r\n" +
                "A object named \"data\" contains two list and an attributes, one list named \"actions\" contains the 3 most recommended actions, the more recommened an action is, the lower index it is at." +
                "The other list named \"preRes\" contains the 3 most likely predicted results(outcomes), the more likely an outcome is, the lower index it is at. " +
                "Each predicted result is a object that has two attributes: \"des\" for description of the outcome (limited to 30 words) and \"prob\" for probability of the outcome which is a number between 0 to 100" +
                "The last attribute in \"data\" is \"mentalProfile\" which is a string that describes the core mental features of user.\r\n";

                question += mapInformation.questionDesc;
                question += mapInformation.mentalProfille;
                question += mapInformation.actionsTaken;
            }


            return question;
        }

        private void UpdateMapInformationFromAI(MapInformation mapInformation, JsonElement aiResponse)
        {
            try
            {
                mapInformation.mentalProfille = aiResponse.GetProperty("mentalProfile").GetString();
                _cache.Set(mapInformation.userId, mapInformation, TimeSpan.FromHours(1));
            }
            catch(Exception e)
            {
                _logger.LogError("Failed to update map information from AI response: {Error}", e.Message);
            }
            
        }

        public enum AskType
        {
            MentalAnswer = 0,
            ActionTaken = 1
        }

        // 发送问题到 AI
        public async Task<ApiResponse> AskAI(string userId, string question, string[] list, AskType askType)
        {
            var mapInformation = GetMapInformation(userId);
            if(askType == AskType.ActionTaken && mapInformation.questionDesc == null)
            {
                // cache expired
                return null;
            }

            mapInformation = UpdateMapInformationFromUser(mapInformation, question, list, askType);  

            string finalQuestion = OrganizeQuestion(mapInformation, askType);


            // send to AI
            var request = new
            {
                contents = new[]
                {
                    new
                    {
                        parts = new[]
                        {
                            new { text = finalQuestion }
                        }
                    }
                }
            };


            var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");
            //_httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {_apiKey}");


            var apiUrl = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={_apiKey}";
            var response = await _httpClient.PostAsync(apiUrl, content);
            var responseBody = await response.Content.ReadAsStringAsync();
            Console.WriteLine(responseBody);
            using var doc = JsonDocument.Parse(responseBody);
            JsonElement aiResponse;
            _logger.LogInformation("AI response: {AiResponse}", responseBody);
            try
            {
                aiResponse = doc.RootElement.GetProperty("candidates")[0]
                                   .GetProperty("content")
                                   .GetProperty("parts")[0]
                                   .GetProperty("text");

                // 🛠️ Strip markdown code block formatting
                var trimStr = Regex.Replace(aiResponse.GetString(), @"```json|```|\n|\\", "").Trim();
                if (trimStr.StartsWith("\"") && trimStr.EndsWith("\""))
                {
                    trimStr = trimStr[1..^1]; // C# slice to remove first & last character
                }

                if (!trimStr.StartsWith("{"))
                {
                    trimStr = "{" + trimStr + "}";
                }

                _logger.LogInformation("Trimmed AI response: {AiResponse}", trimStr);
                // 3️⃣ Ensure JSON is correctly formatted before parsing

                using JsonDocument jsonDoc = JsonDocument.Parse(trimStr);
                aiResponse = jsonDoc.RootElement.GetProperty("data").Clone();

                _logger.LogInformation("✅ Successfully parsed AI response: {AiResponse}", aiResponse);
            }
            catch (Exception e)
            {
                _logger.LogError("Failed to parse AI response: {Error}", e.Message);
                return null;
            }

            UpdateMapInformationFromAI(mapInformation, aiResponse);

            string[] recommendedActions;
            AIPrediction[] predictions;
            try
            {
                var _recommendedActions = aiResponse.GetProperty("actions");
                recommendedActions = new string[_recommendedActions.GetArrayLength()];
                for (int i = 0; i < _recommendedActions.GetArrayLength(); i++)
                {
                    recommendedActions[i] = _recommendedActions[i].GetString();
                }
            }
            catch (Exception e)
            {
                _logger.LogError("Failed to parse recommended actions: {Error}", e.Message);
                return null;
            }

            try
            {
                var _predictions = aiResponse.GetProperty("preRes");
                predictions = new AIPrediction[_predictions.GetArrayLength()];
                for (int i = 0; i < _predictions.GetArrayLength(); i++)
                {
                    predictions[i] = new AIPrediction();
                    predictions[i].des = _predictions[i].GetProperty("des").GetString();
                    predictions[i].prob = _predictions[i].GetProperty("prob").GetDouble();
                }
            }
            catch(Exception e)
            {
                _logger.LogError("Failed to parse predictions: {Error}", e.Message);
                return null;
            }

            // response
            return new ApiResponse
            {
                code = 0,
                data = new AIResult
                {
                    actionList = recommendedActions,
                    preRes = predictions,
                },
                msg = "Success"
            };
        }
    }

    // 🟢 消息结构（支持上下文）
    public class Message
    {
        public string role { get; set; } // "user" 或 "assistant"
        public string content { get; set; }
    }

    // 🟢 AI 响应结构
    public class ApiResponse
    {
        public int code { get; set; }
        public AIResult data { get; set; }
        public string msg { get; set; }
    }

    public class AIResult
    {
        public string[] actionList { get; set; }
        public AIPrediction[] preRes { get; set; }
    }

    public class AIPrediction
    {
        public string des { get; set; }
        public double prob { get; set; }
    }

}
