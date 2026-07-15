import express from "express";
import textToSpeech from "@google-cloud/text-to-speech";

const app = express();
const client = new textToSpeech.TextToSpeechClient();
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const voiceProfiles = {
  auto: [
    { languageCode: "en-GB", name: "en-GB-Chirp3-HD-Charon" },
    { languageCode: "en-US", name: "en-US-Chirp3-HD-Fenrir" },
    { languageCode: "en-GB", name: "en-GB-Chirp3-HD-Iapetus" },
    { languageCode: "en-US", name: "en-US-Chirp3-HD-Orus" },
  ],
  pilotUk: [
    { languageCode: "en-GB", name: "en-GB-Chirp3-HD-Fenrir" },
    { languageCode: "en-GB", name: "en-GB-Chirp3-HD-Charon" },
    { languageCode: "en-GB", name: "en-GB-Chirp3-HD-Umbriel" },
  ],
  pilotUs: [
    { languageCode: "en-US", name: "en-US-Chirp3-HD-Charon" },
    { languageCode: "en-US", name: "en-US-Chirp3-HD-Fenrir" },
    { languageCode: "en-US", name: "en-US-Chirp3-HD-Iapetus" },
  ],
  calmController: [
    { languageCode: "en-GB", name: "en-GB-Chirp3-HD-Orus" },
    { languageCode: "en-GB", name: "en-GB-Chirp3-HD-Schedar" },
  ],
  fastJet: [
    { languageCode: "en-US", name: "en-US-Chirp3-HD-Fenrir" },
    { languageCode: "en-GB", name: "en-GB-Chirp3-HD-Puck" },
    { languageCode: "en-US", name: "en-US-Chirp3-HD-Umbriel" },
  ],
};

function selectVoice(profileId, text) {
  const voices = voiceProfiles[profileId] || voiceProfiles.auto;
  const hash = [...text].reduce(
    (value, character) => ((value * 31 + character.charCodeAt(0)) >>> 0),
    7
  );

  return voices[hash % voices.length];
}

app.use(express.json({ limit: "16kb" }));

app.use((request, response, next) => {
  const origin = request.get("origin");

  if (origin && allowedOrigins.includes(origin)) {
    response.set("Access-Control-Allow-Origin", origin);
    response.set("Vary", "Origin");
  }

  if (request.method === "OPTIONS") {
    response.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    response.set("Access-Control-Allow-Headers", "Content-Type");
    return response.sendStatus(origin && allowedOrigins.includes(origin) ? 204 : 403);
  }

  if (allowedOrigins.length && origin && !allowedOrigins.includes(origin)) {
    return response.status(403).json({ error: "Origin not allowed" });
  }

  next();
});

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.post("/synthesize", async (request, response) => {
  const text = String(request.body?.text || "").trim();
  const voiceKey = String(request.body?.voiceKey || text);
  const profile = selectVoice(request.body?.profile, voiceKey);

  if (!text || text.length > 3000) {
    return response.status(400).json({ error: "Text must be 1-3000 characters" });
  }

  try {
    const [result] = await client.synthesizeSpeech({
      input: { text },
      voice: profile,
      audioConfig: {
        audioEncoding: "MP3",
        effectsProfileId: ["telephony-class-application"],
      },
    });

    response.set("Content-Type", "audio/mpeg");
    response.set("Cache-Control", "private, max-age=300");
    return response.send(result.audioContent);
  } catch (error) {
    console.error("Google speech synthesis failed", error);
    return response.status(502).json({ error: "Speech synthesis failed" });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`VINTLANDER Google TTS listening on ${port}`);
});
