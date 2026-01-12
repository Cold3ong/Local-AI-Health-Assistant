// server.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

const app = express();
const port = 3000;

// ---------------- LM Studio as OpenAI-compatible server ----------------
const client = new OpenAI({
  baseURL: "http://127.0.0.1:1234/v1", // LM Studio OpenAI server，一定要有 /v1
  apiKey: "not-needed",                // LM Studio 唔 check，但 SDK 需要個值
});

// 取得 __dirname（因為用 ES module）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 靜態檔案（前端）
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// ---------------- Tools / Functions 定義 ----------------

// 1) 真正執行嘅 JS function：攞系統時間
function getCurrentTime() {
  const now = new Date();
  return {
    iso: now.toISOString(),
    locale: now.toLocaleString(), // 根據 server 所在地
  };
}

// 2) 🆕 真正執行嘅 JS function：產生 Workout Schedule
//    Output 會直接配合你前端用嘅 scheduleData 結構：[{ time, activity }, ...]
function createWorkoutPlanTool(params = {}) {
  const {
    days = 1,                            // 預設 1 日
    focus = "general_fitness",           // fat_loss / muscle_gain / general_fitness
    level = "beginner",                  // beginner / intermediate / advanced
    sessionMinutes = 45,
  } = params;

  const plan = [];

  const totalDays = Math.min(days, 7);   // prototype：最多 7 日

  for (let d = 1; d <= totalDays; d++) {
    const dayPrefix = `Day ${d}`;

    if (focus === "fat_loss") {
      plan.push(
        {
          time: `${dayPrefix} - 6:00 AM`,
          activity: "Morning cardio - 30 min brisk walk or light jog",
        },
        {
          time: `${dayPrefix} - 7:00 AM`,
          activity: "Breakfast and hydration",
        },
        {
          time: `${dayPrefix} - 12:00 PM`,
          activity: "Light stretching or yoga - 10–15 minutes",
        },
        {
          time: `${dayPrefix} - 6:00 PM`,
          activity: "Bodyweight circuit (squats, push-ups, rows) - 20–30 minutes",
        },
        {
          time: `${dayPrefix} - 7:30 PM`,
          activity: "Cool down walk + stretching",
        },
      );
    } else if (focus === "muscle_gain") {
      const focusLabel = d % 3 === 1 ? "Upper body"
        : d % 3 === 2 ? "Lower body"
        : "Full body / core";
      plan.push(
        {
          time: `${dayPrefix} - 6:00 AM`,
          activity: "Light mobility warm-up - 10 minutes",
        },
        {
          time: `${dayPrefix} - 6:30 PM`,
          activity: `Strength training (${focusLabel}) - ${sessionMinutes} minutes`,
        },
        {
          time: `${dayPrefix} - 7:30 PM`,
          activity: "Cool down stretching",
        },
      );
    } else {
      // general_fitness
      plan.push(
        {
          time: `${dayPrefix} - 7:00 AM`,
          activity: "Easy walk or light cardio - 20 minutes",
        },
        {
          time: `${dayPrefix} - 6:00 PM`,
          activity: "Mix of light strength + stretching - 20–30 minutes",
        },
      );
    }
  }

  return plan;
}

// Tool schema（比 LM Studio / model 睇）
// 現在有兩個 tools：getCurrentTime + createWorkoutPlan
const tools = [
  {
    type: "function",
    function: {
      name: "getCurrentTime",
      description: "Get the current local time of the server.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "createWorkoutPlan",
      description:
        "Generate a simple workout schedule as time/activity pairs for the given goal.",
      parameters: {
        type: "object",
        properties: {
          days: {
            type: "integer",
            description: "How many days of workout plan to generate (1–7).",
          },
          focus: {
            type: "string",
            description:
              "Main fitness goal: fat_loss, muscle_gain, or general_fitness.",
            enum: ["fat_loss", "muscle_gain", "general_fitness"],
          },
          level: {
            type: "string",
            description:
              "Experience level of the user: beginner, intermediate, or advanced.",
            enum: ["beginner", "intermediate", "advanced"],
          },
          sessionMinutes: {
            type: "integer",
            description:
              "Approximate workout session length in minutes (e.g., 30, 45, 60).",
          },
        },
        required: ["days"],
        additionalProperties: false,
      },
    },
  },
];

// ---------------- Chat endpoint ----------------

app.post("/api/chat", async (req, res) => {
  try {
    const userMessage = req.body.message || "";
    const roomName = req.body.roomName || "General Health";

    const baseMessages = [
      {
        role: "system",
        content:
          "You are a friendly Cantonese-speaking health assistant. " +
          "Reply mainly in Cantonese, but keep health/fitness terms in English when appropriate. " +
          "You MUST always remind users that you are not a doctor and they should consult professionals for medical concerns. " +
          "If the user asks about the current time / now / 幾點, you SHOULD use the getCurrentTime tool. " +
          "If the user asks for a workout schedule, exercise plan, gym routine, 或者『幫我整運動時間表』，" +
          "you SHOULD call the createWorkoutPlan tool with appropriate arguments (days, focus, level, sessionMinutes). " +
          `The current chat room name is: "${roomName}", use it only as soft context about their goal.`,
      },
      { role: "user", content: userMessage },
    ];

    // 1️⃣ 第一次 call LM Studio：等佢決定用唔用 tools
    const first = await client.chat.completions.create({
      model: "nousresearch-hermes-2-pro-llama-3-8b-molecule16-i1",
      messages: baseMessages,
      tools,
      tool_choice: "auto",
    });

    console.log(
      "First response from LM Studio:",
      JSON.stringify(first, null, 2),
    );

    if (!first.choices || first.choices.length === 0) {
      return res.status(500).json({
        type: "text",
        message: "對唔住，AI 冇正常回應。",
        scheduleData: null,
        dietData: null,
        usedTool: false,
        raw: first,
      });
    }

    const firstMsg = first.choices[0].message;
    const toolCalls = firstMsg.tool_calls;

    // 如果冇用任何 tool → 普通文字回答
    if (!toolCalls || toolCalls.length === 0) {
      return res.json({
        type: "text",
        message: firstMsg.content,
        scheduleData: null,
        dietData: null,
        usedTool: false,
      });
    }

    // 情況 B：用咗 tools，我哋逐個執行，並且收集 scheduleData（俾前端畫卡）
    const toolMessages = [];
    let scheduleData = null; // 用來回俾前端嘅 workout schedule（如果有）

    for (const call of toolCalls) {
      const toolName = call.function.name;
      let toolResult = null;

      // 將 arguments 由 JSON string 變成 JS object
      let args = {};
      try {
        args = call.function.arguments
          ? JSON.parse(call.function.arguments)
          : {};
      } catch (e) {
        console.warn("Failed to parse tool arguments:", e);
      }

      if (toolName === "getCurrentTime") {
        toolResult = getCurrentTime();
      } else if (toolName === "createWorkoutPlan") {
        const plan = createWorkoutPlanTool(args);
        toolResult = { plan };
        scheduleData = plan; // 等陣直接回俾前端用
      } else {
        toolResult = { error: `Unknown tool: ${toolName}` };
      }

      toolMessages.push({
        role: "tool",
        tool_call_id: call.id,
        name: toolName,
        content: JSON.stringify(toolResult),
      });
    }

    // 2️⃣ 第二次 call LM Studio：畀 tool 結果，叫佢用自然語言講返
    const second = await client.chat.completions.create({
      model: "nousresearch-hermes-2-pro-llama-3-8b-molecule16-i1",
      messages: [...baseMessages, firstMsg, ...toolMessages],
    });

    console.log(
      "Second response from LM Studio:",
      JSON.stringify(second, null, 2),
    );

    if (!second.choices || second.choices.length === 0) {
      return res.status(500).json({
        type: "text",
        message: "對唔住，AI 喺處理工具結果時出現咗問題。",
        scheduleData,
        dietData: null,
        usedTool: true,
        raw: second,
      });
    }

    const finalMsg = second.choices[0].message;

    // 如果有 scheduleData → 當作 schedule message，俾前端畫 workout card
    const responseType = scheduleData ? "schedule" : "text";

    res.json({
      type: responseType,        // "schedule" 或 "text"
      message: finalMsg.content, // AI 用自然語言講返 result
      scheduleData: scheduleData,
      dietData: null,            // 之後你可以加 createDietPlan 時用
      usedTool: true,
    });
  } catch (err) {
    console.error("Error in /api/chat:", err);
    res.status(500).json({
      type: "text",
      message: "Server error，請稍後再試。",
      scheduleData: null,
      dietData: null,
      usedTool: false,
      detail: String(err),
    });
  }
});

// 啟動 server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
