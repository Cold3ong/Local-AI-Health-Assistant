# Health AI Assistant (LM Studio + Function Calling)
This project is created By Wong Keng Wa Kovey 24018054D
A small prototype web application that lets users chat with an AI health assistant.  
Users can:

- Create multiple chat rooms (e.g. General Health, Weight Loss, Muscle Building)
- Ask general health questions (non-medical advice only)
- Ask the AI to generate **workout schedules** and **diet plans**
- Save generated workout/diet plans into **My Schedule** and **My Diet**
- Benefit from **per-room conversation context** so each room has its own “short-term memory”

The backend uses **LM Studio** running in OpenAI-compatible mode for:
- Chat completions (LLM responses)
- **Function calling** (tools) to:
  - `getCurrentTime` – provide current server time
  - `createWorkoutPlan` – validate AI-generated workout schedules as JSON
  - `createDietPlan` – validate AI-generated diet plans as JSON

The frontend is a single-page web app (HTML + vanilla JS + CSS) storing messages in `localStorage` via a simple SDK.

> ⚠️ **Disclaimer**  
> This project is for learning / prototyping only.  
> The AI assistant is **not** a doctor or dietitian and must **not** be used for real medical decisions.

---

## 1. Project Structure

```text
project-root/
  server.js             # Node.js backend (Express + OpenAI SDK + LM Studio tools)
  package.json          # Node project config & dependencies (you create via npm)
  public/
    index.html          # Frontend SPA (multi-room chat UI + My Schedule/My Diet)
    _sdk/
      data_sdk.js       # Small wrapper around localStorage (CRUD for messages)
      element_sdk.js    # Utility helpers for DOM / UI
"# Local-AI-Health-Assistant" 
