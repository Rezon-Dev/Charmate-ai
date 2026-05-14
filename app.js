const characterList = document.getElementById("characterList");
const characterName = document.getElementById("characterName");
const characterDesc = document.getElementById("characterDesc");
const chatMessages = document.getElementById("chatMessages");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const apiKeyInput = document.getElementById("apiKey");
const saveKeyBtn = document.getElementById("saveKeyBtn");
const clearBtn = document.getElementById("clearBtn");

let selectedCharacter = CHARACTERS[0];

apiKeyInput.value = localStorage.getItem("gemini_api_key") || "";

function storageKey() {
  return `chat_${selectedCharacter.id}`;
}

function loadChat() {
  chatMessages.innerHTML = "";
  const history = JSON.parse(localStorage.getItem(storageKey()) || "[]");

  if (history.length === 0) {
    addMessage("ai", selectedCharacter.name + ": " + getGreeting(selectedCharacter.id), false);
  } else {
    history.forEach(msg => addMessage(msg.role, msg.text, false));
  }
}

function saveChat(role, text) {
  const history = JSON.parse(localStorage.getItem(storageKey()) || "[]");
  history.push({ role, text });
  localStorage.setItem(storageKey(), JSON.stringify(history.slice(-40)));
}

function addMessage(role, text, save = true) {
  const div = document.createElement("div");
  div.className = `message ${role}`;
  div.textContent = text;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  if (save) saveChat(role, text);
}

function getGreeting(id) {
  const greetings = {
    study_friend: "Hi! Tell me what you want to study today.",
    tech_mentor: "Hey coder! What are you building?",
    story_writer: "Ready to turn your idea into words?",
    business_helper: "Let’s build a smart earning idea step by step."
  };
  return greetings[id] || "Hi! How can I help?";
}

function renderCharacters() {
  characterList.innerHTML = "";
  CHARACTERS.forEach(char => {
    const card = document.createElement("div");
    card.className = "character-card" + (char.id === selectedCharacter.id ? " active" : "");
    card.innerHTML = `<strong>${char.name}</strong><span>${char.desc}</span>`;
    card.onclick = () => {
      selectedCharacter = char;
      characterName.textContent = char.name;
      characterDesc.textContent = char.desc;
      renderCharacters();
      loadChat();
    };
    characterList.appendChild(card);
  });
}

async function askGemini(message) {
  const apiKey = localStorage.getItem("gemini_api_key");
  if (!apiKey) {
    return "Please paste your Gemini API key first and tap Save.";
  }

  const history = JSON.parse(localStorage.getItem(storageKey()) || "[]")
    .slice(-12)
    .map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`)
    .join("\n");

  const prompt = `
${selectedCharacter.prompt}

Safety rules:
- Be friendly and helpful.
- Do not give dangerous, illegal, explicit, or harmful instructions.
- Keep replies suitable for teenagers.

Recent chat:
${history}

User: ${message}
${selectedCharacter.name}:

const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await res.json();

    if (!res.ok) {
      return "API error: " + (data.error?.message || "Check your API key.");
    }

    return data.candidates?.[0]?.content?.parts?.[0]?.text || "No reply received.";
  } catch (err) {
    return "Network error. Check internet or API key.";
  }
}

saveKeyBtn.onclick = () => {
  localStorage.setItem("gemini_api_key", apiKeyInput.value.trim());
  saveKeyBtn.textContent = "Saved";
  setTimeout(() => saveKeyBtn.textContent = "Save", 1000);
};

clearBtn.onclick = () => {
  localStorage.removeItem(storageKey());
  loadChat();
};

chatForm.onsubmit = async (e) => {
  e.preventDefault();
  const text = userInput.value.trim();
  if (!text) return;

  userInput.value = "";
  addMessage("user", text);

  const loading = document.createElement("div");
  loading.className = "message ai";
  loading.textContent = selectedCharacter.name + " is typing...";
  chatMessages.appendChild(loading);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  const reply = await askGemini(text);
  loading.remove();
  addMessage("ai", reply);
};

characterName.textContent = selectedCharacter.name;
characterDesc.textContent = selectedCharacter.desc;
renderCharacters();
loadChat();
