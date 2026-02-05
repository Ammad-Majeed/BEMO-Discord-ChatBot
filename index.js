require("dotenv").config();
const fs = require("fs");
const { Client, GatewayIntentBits } = require("discord.js");
const OpenAI = require("openai");

// 1️⃣ Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// 2️⃣ Create OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 🧠 Load saved conversations from file (if exists)
let conversations = {};
const memoryFile = "conversations.json";

if (fs.existsSync(memoryFile)) {
  try {
    const data = fs.readFileSync(memoryFile, "utf8");
    conversations = JSON.parse(data);
    console.log("🧠 Loaded previous conversations from file.");
  } catch (err) {
    console.error("⚠️ Error reading memory file:", err);
  }
}

// 💾 Save conversations to file
function saveConversations() {
  try {
    fs.writeFileSync(memoryFile, JSON.stringify(conversations, null, 2));
  } catch (err) {
    console.error("⚠️ Error saving conversations:", err);
  }
}

// 3️⃣ Ready event
client.once("clientReady", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// 4️⃣ Prefix setup
const PREFIX = "gpt!";

// 5️⃣ Message handler
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const [command, ...args] = message.content
    .slice(PREFIX.length)
    .trim()
    .split(/ +/);

  // Simple hello test
  if (command === "hello") {
    return message.reply("Hello 👋 I'm alive!");
  }

  // Chat mode with memory
  if (command === "ask") {
    const userMessage = args.join(" ");
    if (!userMessage) {
      return message.reply("❌ Please ask me something after `gpt!ask`");
    }

    try {
      const userId = message.author.id;

      // Create history if not exist
      if (!conversations[userId]) {
        conversations[userId] = [];
      }

      // Add user message
      conversations[userId].push({ role: "user", content: userMessage });

      // Keep only last 10 messages to save tokens
      if (conversations[userId].length > 10) {
        conversations[userId].shift();
      }

      // Send full conversation history
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: conversations[userId],
      });

      const replyContent =
        response.choices[0]?.message?.content || "⚠️ No response.";

      // Save assistant reply in memory
      conversations[userId].push({ role: "assistant", content: replyContent });

      // 💾 Save memory to file after each interaction
      saveConversations();

      await message.reply(replyContent);
    } catch (error) {
      console.error("OpenAI API Error:", error);
      await message.reply("⚠️ Oops! Something went wrong.");
    }
  }
});

// 6️⃣ Login at the end 
client.login(process.env.BOT_TOKEN);