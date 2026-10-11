const sessionAssignments = new Map();

export function getStableRadioVoice(
  voices = [],
  voiceKey = "AIRCRAFT",
  preferredVoiceName = ""
) {
  const candidates = voices.filter((voice) => /^en/i.test(voice.lang));
  if (!candidates.length) return null;

  const key = String(voiceKey || "AIRCRAFT").trim().toUpperCase();
  const scope = key.includes("::") ? key.split("::")[0] : "CURRENT";
  const assignments = sessionAssignments.get(scope) || {};
  const assignedVoice = candidates.find(
    (voice) => voice.name === assignments[key]
  );
  if (assignedVoice) return assignedVoice;

  const orderedCandidates = preferredVoiceName
    ? [
        ...candidates.filter((voice) => voice.name === preferredVoiceName),
        ...candidates.filter((voice) => voice.name !== preferredVoiceName),
      ]
    : candidates;
  const usedByOtherAircraft = new Set(
    Object.entries(assignments)
      .filter(([assignmentKey]) => assignmentKey !== key)
      .map(([, voiceName]) => voiceName)
  );
  const unusedCandidates = orderedCandidates.filter(
    (voice) => !usedByOtherAircraft.has(voice.name)
  );
  const selectionPool = unusedCandidates.length
    ? unusedCandidates
    : orderedCandidates;
  const selectedVoice = selectionPool[hashVoiceKey(key) % selectionPool.length];

  assignments[key] = selectedVoice.name;
  sessionAssignments.set(scope, assignments);
  return selectedVoice;
}

function hashVoiceKey(value) {
  return [...value].reduce(
    (hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0,
    0
  );
}

