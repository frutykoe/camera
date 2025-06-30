const G_API = atob("QUl6YVN5Q0M1d0ZQV0FkWlh0Sm9sNkt0RDBzRUwtd2JYNU16OTVn"); 
const G_CSE = atob("ZTcxNzEwZGJiZmMyNTQ1ODU=");
const Y_API = atob("QUl6YVN5Q1pNY3JqNUtmTjkyT3R1SHpiTUZHTHd2QTU1NktvaFZB");

const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatBox = document.getElementById("chatBox");
const toggleBtn = document.getElementById("darkToggle");
const youtubeToggle = document.getElementById("youtubeToggle");

let responses = {};
let youtubeEnabled = false;

fetch("https://raw.githubusercontent.com/frutykoe/A/main/balasan.json")
  .then(res => res.json())
  .then(data => responses = data);

function scrollToBottom() {
  chatBox.scrollTop = chatBox.scrollHeight;
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function addMessage(sender, text) {
  const msg = document.createElement("div");
  msg.className = `message ${sender}`;
  const isHTML = /<\/?[a-z][\s\S]*>/i.test(text);
  msg.innerHTML = `
    <div class="avatar ${sender}"></div>
    <div class="text">${isHTML ? text : escapeHTML(text)}</div>
  `;
  chatBox.appendChild(msg);
  scrollToBottom();

  if (sender === "bot" && !isHTML) {
    const speak = new SpeechSynthesisUtterance(text);
    speak.lang = "id-ID";
    speechSynthesis.speak(speak);
  }
}

async function getWikipediaAnswer(query) {
  const endpoint = `https://id.wikipedia.org/w/api.php?` +
    new URLSearchParams({
      action: "query",
      format: "json",
      prop: "extracts",
      exintro: "true",
      explaintext: "true",
      origin: "*",
      titles: query
    });

  try {
    const res = await fetch(endpoint);
    const data = await res.json();
    const pages = data.query.pages;
    const page = Object.values(pages)[0];
    if (page && page.extract) {
      let text = page.extract.trim();
      if (text.length > 1000) {
        text = text.slice(0, 1000).trim() + "...";
      }
      return `${text} [sumber: <a href="https://id.wikipedia.org/wiki/${encodeURIComponent(query)}" target="_blank">Wikipedia</a>]`;
    }
  } catch (e) {
    console.warn("Wikipedia API error:", e);
  }
  return null;
}

async function getGoogleAnswer(query) {
  const endpoint = `https://www.googleapis.com/customsearch/v1?key=${G_API}&cx=${G_CSE}&q=${encodeURIComponent(query)}&num=1`;
  try {
    const res = await fetch(endpoint);
    const data = await res.json();
    if (data.items && data.items.length > 0) {
      const top = data.items[0];
      return `${top.snippet} [sumber: <a href="${top.link}" target="_blank">${top.link}</a>]`;
    }
  } catch (err) {
    console.warn("Google API error:", err);
  }
  return null;
}

async function getStackOverflowAnswer(query) {
  const stackQuery = `${query} site:stackoverflow.com`;
  const endpoint = `https://www.googleapis.com/customsearch/v1?key=${G_API}&cx=${G_CSE}&q=${encodeURIComponent(stackQuery)}&num=1`;

  try {
    const res = await fetch(endpoint);
    const data = await res.json();
    if (data.items && data.items.length > 0) {
      const top = data.items[0];
      let snippet = top.snippet.trim();
      if (snippet.length > 2000) {
        snippet = snippet.slice(0, 2000).trim() + "...";
      }
      return `<div style="font-size:10px; line-height:1.3;">${escapeHTML(snippet)}<br><br>[sumber: <a href="${top.link}" target="_blank">${top.link}</a>]</div>`;
    }
  } catch (err) {
    console.warn("StackOverflow API error:", err);
  }
  return null;
}

async function searchYouTubeLite(query) {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(query)}&key=${Y_API}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.items && data.items.length > 0) {
      const video = data.items[0];
      const videoId = video.id.videoId;
      const title = video.snippet.title;
      return `
        <p>${escapeHTML(title)}</p>
        <iframe width="100%" height="200" src="https://www.youtube.com/embed/${videoId}" 
        frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
        allowfullscreen></iframe>
      `;
    }
  } catch (e) {
    console.warn("YouTube API error:", e);
  }
  return null;
}

youtubeToggle.addEventListener("click", () => {
  youtubeEnabled = !youtubeEnabled;
  youtubeToggle.textContent = youtubeEnabled ? "🎥 Video: ON" : "🎥 Video: OFF";
  youtubeToggle.classList.toggle("active", youtubeEnabled);
});

toggleBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  toggleBtn.textContent = document.body.classList.contains("dark") ? "☀️ Light Mode" : "🌙 Dark Mode";
});

chatForm.addEventListener("submit", async e => {
  e.preventDefault();
  const input = userInput.value.trim();
  if (!input) return;

  addMessage("user", input);
  const key = input.toLowerCase();
  let replyFound = false;

  // 1. Static response
  for (const pattern in responses) {
    const lowerPattern = pattern.toLowerCase();
    if (key === lowerPattern || key.startsWith(lowerPattern) || key.includes(lowerPattern)) {
      addMessage("bot", responses[pattern]);
      replyFound = true;
      break;
    }
  }

  // 2. Video ON
  if (!replyFound && youtubeEnabled) {
    if (input.startsWith(".")) {
      const soQuery = input.slice(1).trim();
      if (soQuery) {
        const soAnswer = await getStackOverflowAnswer(soQuery);
        if (soAnswer) {
          addMessage("bot", soAnswer);
        } else {
          addMessage("bot", "Maaf, saya tidak menemukan jawaban di Stack Overflow.");
        }
      } else {
        addMessage("bot", "Silakan masukkan pertanyaan setelah titik (.)");
      }
      replyFound = true;
    } else {
      const youtubeReply = await searchYouTubeLite(input);
      if (youtubeReply) {
        addMessage("bot", youtubeReply);
      } else {
        addMessage("bot", "Maaf, saya tidak menemukan video terkait.");
      }
      replyFound = true;
    }
  }

  // 3. Video OFF
  if (!replyFound && !youtubeEnabled) {
    const wikiReply = await getWikipediaAnswer(input);
    const googleReply = await getGoogleAnswer(input);

    if (wikiReply) addMessage("bot", wikiReply);
    if (googleReply) setTimeout(() => addMessage("bot", googleReply), 1000);

    if (!wikiReply && !googleReply) {
      addMessage("bot", "Maaf, saya tidak menemukan informasi yang relevan.");
    }
    replyFound = true;
  }

  if (!replyFound) {
    addMessage("bot", "Maaf, saya tidak mengerti pertanyaan itu.");
  }

  userInput.value = "";
});

userInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    chatForm.requestSubmit();
  }
});
