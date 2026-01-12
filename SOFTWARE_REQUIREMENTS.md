
---

```markdown
# SOFTWARE REQUIREMENTS SPECIFICATION (SRS)

## 1. Introduction

### 1.1 Purpose

This document describes the **software requirements** for the **Health AI Assistant** prototype:

- A multi-room health chat application.
- Powered by a local LLM (via LM Studio) with **function calling**.
- Focused on generating **workout schedules** and **diet plans** in structured JSON for UI rendering.

### 1.2 Scope

The system allows a single user (on one browser/device) to:

- Chat with an AI assistant in multiple rooms.
- Ask for workout and diet plans, specified via natural language.
- Save generated plans and view them later in dedicated pages.
- Benefit from **per-room conversation context** across turns.

This is a **prototype** for personal learning and experimentation, not a production medical tool.

---

## 2. Overall Description

### 2.1 System Perspective

The system consists of:

- **Frontend SPA (Single Page Application)**
  - Runs in the browser.
  - Renders UI (chat rooms, messages, My Schedule, My Diet).
  - Stores all data in `localStorage`.

- **Backend (Node.js + Express)**
  - Serves static frontend files.
  - Exposes a single API: `POST /api/chat`.
  - Uses OpenAI SDK to call LM Studio’s OpenAI-compatible server.
  - Contains function calling tool definitions and JSON validators.

- **LM Studio server**
  - Hosts a local LLM.
  - Exposes `/v1/chat/completions` compatible with OpenAI API.
  - Supports the `tools` / function calling mechanism.

### 2.2 User Characteristics

- Technical background: basic web user; may be the same person who is developing the project.
- Language: Cantonese for general conversation, English for technical health/fitness terms.
- Not assumed to be a medical professional.

---

## 3. Functional Requirements

### 3.1 Chat Room Management

**FR-1**: The system shall provide a default chat room called “General Health”.

**FR-2**: The user shall be able to create additional chat rooms with custom names.

**FR-3**: Each chat room shall maintain an independent message history.

**FR-4**: The user shall be able to switch between chat rooms and see only that room’s messages.

**FR-5**: The user shall be able to delete non-default chat rooms (subject to limits).

**FR-6**: The system shall prevent the deletion of the currently active/chatting room (or handle it safely).

---

### 3.2 Messaging & AI Interaction

**FR-7**: The user shall be able to send text messages from the frontend to the backend via `/api/chat`.

**FR-8**: The backend shall call the LLM (via LM Studio) to generate AI responses.

**FR-9**: The backend shall return messages with a `type` field:
- `"text"` for normal replies.
- `"schedule"` for workout schedules.
- `"diet"` for diet/meal plans.

**FR-10**: The frontend shall render different UI elements based on `type`:
- Text bubble for `"text"`.
- Workout card for `"schedule"` (using `scheduleData`).
- Diet card for `"diet"` (using `dietData`).

**FR-11**: For workout or diet responses, the AI shall also provide a natural-language explanation for the generated plan (`message` field).

---

### 3.3 Function Calling (Tools)

**FR-12**: The backend shall expose tools to the model via `tools` / function calling:
- `getCurrentTime`
- `createWorkoutPlan`
- `createDietPlan`

**FR-13**: When the user asks about current time, the model **should** call `getCurrentTime`, and the backend shall return the time.

**FR-14**: When the user asks for a workout schedule:
- The model shall generate the **full workout plan** as JSON in the `plan` argument.
- The backend shall validate `plan` via `createWorkoutPlanTool`.
- The backend shall send the validated plan back to the frontend as `scheduleData`.

**FR-15**: When the user asks for a diet plan:
- The model shall generate the **full diet plan** as JSON in the `plan` argument.
- The backend shall validate `plan` via `createDietPlanTool`.
- The backend shall send the validated plan back to the frontend as `dietData`.

**FR-16**: If the plan is invalid or empty after validation:
- The backend shall still send a safe response (e.g. text message indicating error or fallback).

---

### 3.4 Per-Room Context Window

**FR-17**: The frontend shall maintain a message list with `roomId` per message.

**FR-18**: Before sending a new user message to `/api/chat`, the frontend shall:
- Extract the latest **N messages** (e.g. N=10) for that room.
- Convert them into `{ role, content }` format.
- Include them as `history` in the request body.

**FR-19**: The backend shall insert `history` into the messages sent to the LLM:
- `system` → `...history` → latest `user`.

**FR-20**: The system shall ensure that messages from different rooms are not mixed into each other’s history.

---

### 3.5 Saving Plans (My Schedule / My Diet)

**FR-21**: The frontend shall allow users to save workout schedules:
- A “Save to My Schedule” button on workout cards.

**FR-22**: When saving a schedule:
- The message’s `isSaved` flag shall be set to `true`.
- The message’s `savedType` shall be set to `"schedule"`.

**FR-23**: The “My Schedule” page shall list all messages with:
- `type === "schedule"` and `isSaved === true`.

**FR-24**: The “My Diet” page shall list all messages with:
- `type === "diet"` and `isSaved === true`.

**FR-25**: Saved schedules and diets shall survive page refreshes via `localStorage`.

---

## 4. Non-Functional Requirements

### 4.1 Performance

**NFR-1**: The UI should remain responsive during normal usage.

**NFR-2**: For a single user, average response times (network + LM Studio inference) should be acceptable (< several seconds for typical models).

**NFR-3**: The number of messages used in the context window (N) should be limited (e.g. 10–20) to avoid hitting model context limits.

---

### 4.2 Reliability & Fault Tolerance

**NFR-4**: If the backend or LM Studio fails, the frontend shall:
- Show an error message in the chat (e.g. “Sorry, there was an error connecting to the AI server.”).
- Not crash the UI.

**NFR-5**: If the model returns invalid JSON for `plan`:
- The validator functions should handle it gracefully.
- No unhandled exceptions should crash the server.

---

### 4.3 Security & Privacy

**NFR-6**: No personal health data is sent to any cloud service (LM Studio runs locally).

**NFR-7**: No server-side database is used; all data is stored in the user’s browser.

**NFR-8**: The AI must repeatedly remind users that:
- It is not a doctor / dietitian.
- It cannot provide medical diagnosis.
- Users should consult professionals for serious issues.

**NFR-9**: The system should not encourage unsafe behaviors (extreme diets, overtraining, self-harm).

---

### 4.4 Usability

**NFR-10**: The UI should be simple and intuitive:
- Clear separation of chat, My Schedule, and My Diet.
- Easy to create/switch/delete rooms.
- Clear buttons for saving plans.

**NFR-11**: The assistant should:
- Answer mainly in Cantonese.
- Use English for technical health/fitness/nutrition terms when helpful.

---

### 4.5 Maintainability & Extensibility

**NFR-12**: Backend tools should be defined in a way that:
- New tools can be added (e.g. `calculateBMR`) without breaking existing ones.

**NFR-13**: The frontend should rely on clearly defined message structures:
- `{ id, type, message, sender, timestamp, scheduleData?, dietData?, roomId, roomName, isSaved, savedType }`

**NFR-14**: The system should allow future replacement of:
- LM Studio with another OpenAI-compatible server.
- The local storage layer (`data_sdk.js`) with a remote DB.

---

## 5. Software & Hardware Requirements

### 5.1 Software

- **Node.js** ≥ 18.x
- **npm**
- **LM Studio**
  - With OpenAI-compatible server enabled on `http://127.0.0.1:1234/v1`
  - A chat-capable model with reasonable support for JSON & tools
- **Node Packages**:
  - `express`
  - `openai`
  - (Optional) `nodemon` for development
- **Web Browser**:
  - Latest versions of Chrome, Edge, or Firefox

### 5.2 Hardware

- A machine capable of running LM Studio and the chosen model:
  - Sufficient CPU and RAM (GPU recommended for faster inference).
- Disk space for model weights (size depends on chosen model).

---

## 6. External Interfaces

### 6.1 HTTP API

**`POST /api/chat`**

- **Request body** (JSON):
  ```json
  {
    "roomId": "string",
    "roomName": "string",
    "message": "string",
    "history": [
      { "role": "user", "content": "..." },
      { "role": "assistant", "content": "..." }
    ]
  }
