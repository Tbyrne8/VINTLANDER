import { useEffect, useRef, useState } from "react";

const speechEndpoint = import.meta.env.VITE_GOOGLE_TTS_ENDPOINT || "";
const digits = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];

function radioText(value = "") {
  return String(value)
    .replace(/\b30\s*MM\b/gi, "thirty mike mike")
    .replace(/\bMGRS\b/gi, "em gee arr ess")
    .replace(/\bIP\b/g, "eye pee")
    .replace(/\bBP\b/g, "bee pee")
    .replace(/\bBDA\b/g, "bee dee ayy")
    .replace(/\bPID\b/g, "pee eye dee")
    .replace(/\bIR\b/g, "eye arr")
    .replace(/\bBOT\b/g, "bee oh tee")
    .replace(/\bBOC\b/g, "bee oh see")
    .replace(/\bSEAD\b/g, "see ad")
    .replace(/\bNM\b/gi, "nautical miles")
    .replace(/\d+/g, (number) =>
      [...number].map((digit) => digits[Number(digit)]).join(" ")
    );
}

function callsignName(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function getLine(lines, number) {
  return lines?.find(([lineNumber]) => String(lineNumber) === String(number))?.[2] || "unknown";
}

function makeIncorrectGrid(grid = "") {
  return String(grid).replace(/(\d)(?!.*\d)/, (digit) => String((Number(digit) + 1) % 10));
}

function startRadioBed() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;

  const context = new AudioContext();
  const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = Math.random() * 2 - 1;
  }

  const source = context.createBufferSource();
  const highpass = context.createBiquadFilter();
  const lowpass = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = buffer;
  source.loop = true;
  highpass.type = "highpass";
  highpass.frequency.value = 950;
  lowpass.type = "lowpass";
  lowpass.frequency.value = 2850;
  gain.gain.value = 0.027;
  source.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(gain);
  gain.connect(context.destination);
  source.start();

  const crackleTimer = window.setInterval(() => {
    if (Math.random() > 0.7) return;
    const duration = 0.015 + Math.random() * 0.04;
    const crackle = context.createBuffer(1, context.sampleRate * duration, context.sampleRate);
    const data = crackle.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / data.length);
    }
    const burst = context.createBufferSource();
    const burstGain = context.createGain();
    burst.buffer = crackle;
    burstGain.gain.value = 0.04 + Math.random() * 0.05;
    burst.connect(burstGain);
    burstGain.connect(context.destination);
    burst.start();
  }, 430);

  return { context, source, gain, crackleTimer };
}

function radioClick(bed, end = false) {
  if (!bed?.context) return;
  const oscillator = bed.context.createOscillator();
  const gain = bed.context.createGain();
  oscillator.type = "square";
  oscillator.frequency.value = end ? 680 : 790;
  gain.gain.setValueAtTime(0.001, bed.context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.075, bed.context.currentTime + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, bed.context.currentTime + 0.055);
  oscillator.connect(gain);
  gain.connect(bed.context.destination);
  oscillator.start();
  oscillator.stop(bed.context.currentTime + 0.065);
}

function stopRadioBed(bed) {
  if (!bed) return;
  window.clearInterval(bed.crackleTimer);
  try {
    bed.source.stop();
    bed.context.close();
  } catch {
    // The source may already have ended while a new call starts.
  }
}

export default function MissionRadioPanel({
  controllerCallsign,
  platform,
  target,
  brief,
  briefReady,
  lines,
  readbackState,
  attackStatus,
  attackRunRemainingMs,
  canSendBda,
  bdaEffect,
  bdaText,
  onMarkReadback,
  onSetAttackPhase,
  onSendBda,
}) {
  const [playing, setPlaying] = useState(false);
  const [currentCall, setCurrentCall] = useState("Standby");
  const [sequenceStage, setSequenceStage] = useState("tasking");
  const audioRef = useRef(null);
  const bedRef = useRef(null);

  useEffect(() => () => stopPlayback(), []);
  useEffect(() => {
    setSequenceStage("tasking");
    setCurrentCall("Standby");
  }, [platform?.callsign, target?.id]);
  useEffect(() => {
    if (attackStatus.phase === "On station") {
      setSequenceStage("tasking");
      setCurrentCall("Standby");
    }
  }, [attackStatus.phase]);

  function stopPlayback() {
    window.speechSynthesis?.cancel();
    audioRef.current?.pause();
    audioRef.current = null;
    stopRadioBed(bedRef.current);
    bedRef.current = null;
    setPlaying(false);
  }

  async function playOne({ text, speaker = "aircraft" }) {
    const namedCallsigns = String(text)
      .replaceAll(platform.callsign, callsignName(platform.callsign))
      .replaceAll(controllerCallsign, callsignName(controllerCallsign));
    const formattedText = radioText(namedCallsigns);
    const profile = speaker === "controller" ? "calmController" : "fastJet";
    const voiceKey = speaker === "controller" ? controllerCallsign : platform.callsign;

    if (speechEndpoint) {
      const response = await fetch(speechEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: formattedText, profile, voiceKey }),
      });
      if (!response.ok) throw new Error(`Speech request failed: ${response.status}`);

      const audio = new Audio(URL.createObjectURL(await response.blob()));
      audio.playbackRate = speaker === "controller" ? 1.12 : 1.27;
      audioRef.current = audio;
      const bed = startRadioBed();
      bedRef.current = bed;
      radioClick(bed);
      await new Promise((resolve, reject) => {
        audio.onended = resolve;
        audio.onerror = reject;
        audio.play().catch(reject);
      });
      radioClick(bed, true);
      await new Promise((resolve) => window.setTimeout(resolve, 120));
      stopRadioBed(bed);
      bedRef.current = null;
      return;
    }

    await new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(formattedText);
      utterance.rate = speaker === "controller" ? 1.02 : 1.16;
      utterance.pitch = speaker === "controller" ? 0.82 : 0.7;
      utterance.onend = resolve;
      utterance.onerror = reject;
      window.speechSynthesis.speak(utterance);
    });
  }

  async function playSequence(label, calls, nextStage, action) {
    if (!platform) {
      alert("Select a checked-in aircraft first.");
      return;
    }

    stopPlayback();
    setPlaying(true);
    setCurrentCall(label);
    action?.();

    try {
      for (const call of calls) await playOne(call);
      if (nextStage) setSequenceStage(nextStage);
    } catch (error) {
      console.warn("Mission radio call failed", error);
      alert("Mission radio could not play. Check the speech service and try again.");
    } finally {
      stopPlayback();
    }
  }

  const callsign = platform?.callsign || "aircraft";
  const targetId = target?.id || "target";
  const elevation = getLine(lines, 4);
  const location = getLine(lines, 6);
  const restrictions = brief?.restrictions || "no additional restrictions";
  const ipBp = brief?.ipBp || "current hold";
  const mark = brief?.mark || "talk on";
  const egress = brief?.egress || "as directed";
  const timeToImpactSeconds = Math.max(
    10,
    Math.ceil((attackRunRemainingMs || 30000) / 10000) * 10
  );
  const fullNineLine = (lines || [])
    .map(([number, label, value]) => `Line ${number}, ${label}, ${value || "unknown"}.`)
    .join(" ");
  const inHotCalls = [
    { text: `${controllerCallsign}, ${callsign}, in hot. ${mark}.` },
    ...(String(mark).toUpperCase().includes("LASER")
      ? [
          { speaker: "controller", text: `${callsign}, ${controllerCallsign}, laser on.` },
          { text: `${controllerCallsign}, ${callsign}, spot.` },
        ]
      : []),
  ];

  return (
    <section className="missionRadioPanel">
      <div className="missionRadioHeader">
        <div>
          <small>Live mission radio</small>
          <h3>{currentCall}</h3>
        </div>
        <span className={playing ? "statusPill receiving" : "statusPill"}>
          {playing ? "TRANSMITTING" : "READY"}
        </span>
      </div>

      <p className="missionRadioSummary">
        {callsign} / {targetId} / {attackStatus.phase} / readback {readbackState}
      </p>

      <div className="missionRadioSteps">
        <button
          disabled={playing}
          onClick={() => playSequence(
            "Aircraft requests tasking",
            [{ text: `${controllerCallsign}, ${callsign}, ready for tasking.` }],
            "nineLine"
          )}
        >
          1. Request Tasking
        </button>

        <button
          disabled={playing || !briefReady || sequenceStage !== "nineLine"}
          onClick={() => playSequence(
            "Controller passes 9-Line",
            [
              { text: `${controllerCallsign}, ${callsign}, ready to copy.` },
              { speaker: "controller", text: `${callsign}, ${controllerCallsign}. ${brief?.controlType || "Type two"} control, method ${brief?.attackMethod || "bee oh tee"}. ${fullNineLine} Restrictions, ${restrictions}. Remarks, ${brief?.remarks || "none"}. Standby readback.` },
            ],
            "readback"
          )}
        >
          2. Pass 9-Line
        </button>

        <button
          disabled={playing || !briefReady || sequenceStage !== "readback"}
          onClick={() => playSequence(
            "Correct 9-Line readback",
            [{ text: `${controllerCallsign}, ${callsign}, readback. Elevation ${elevation}. Target location ${location}. Restrictions ${restrictions}.` }],
            "inbound",
            () => onMarkReadback("Correct")
          )}
        >
          3. Correct Readback
        </button>

        <button
          disabled={playing || !briefReady || sequenceStage !== "readback"}
          onClick={() => playSequence(
            "Incorrect 9-Line readback",
            [{ text: `${controllerCallsign}, ${callsign}, readback. Elevation ${elevation}. Target location ${makeIncorrectGrid(location)}.` }],
            "correction",
            () => onMarkReadback("Incorrect")
          )}
        >
          Readback Error
        </button>

        <button
          disabled={playing || readbackState !== "Incorrect"}
          onClick={() => playSequence(
            "Controller correction and readback",
            [
              { speaker: "controller", text: `${callsign}, ${controllerCallsign}, negative. Correction line six, ${location}. Read back.` },
              { text: `${controllerCallsign}, ${callsign}, line six ${location}.` },
            ],
            "inbound",
            () => onMarkReadback("Correct")
          )}
        >
          Correct Readback
        </button>

        <button
          disabled={playing || readbackState !== "Correct"}
          onClick={() => playSequence(
            "IP inbound call",
            [{ text: `${controllerCallsign}, ${callsign}, ${ipBp} inbound.` }],
            "inHot",
            () => onSetAttackPhase("IP inbound")
          )}
        >
          4. IP Inbound
        </button>

        <button
          disabled={playing || !["inHot", "clearance", "weapon", "impact"].includes(sequenceStage)}
          onClick={() => playSequence(
            "Aircraft in hot",
            inHotCalls,
            "clearance",
            () => onSetAttackPhase("In hot")
          )}
        >
          5. In Hot
        </button>

        <button
          disabled={playing || sequenceStage !== "clearance"}
          onClick={() => playSequence(
            "Cleared hot",
            [{ speaker: "controller", text: `${callsign}, ${controllerCallsign}, cleared hot.` }],
            "weapon",
            () => onSetAttackPhase("Cleared hot")
          )}
        >
          6. Cleared Hot
        </button>

        <button
          disabled={playing || sequenceStage !== "clearance"}
          onClick={() => playSequence(
            "Continue dry",
            [{ speaker: "controller", text: `${callsign}, ${controllerCallsign}, continue dry.` }],
            "inbound",
            () => onSetAttackPhase("Dry / no drop")
          )}
        >
          Continue Dry
        </button>

        <button
          disabled={playing || !["clearance", "weapon"].includes(sequenceStage)}
          onClick={() => playSequence(
            "Abort call",
            [{ speaker: "controller", text: `${callsign}, ${controllerCallsign}, abort, abort, abort.` }],
            "inbound",
            () => onSetAttackPhase("Abort")
          )}
        >
          Abort
        </button>

        <button
          disabled={playing || sequenceStage !== "weapon"}
          onClick={() => playSequence(
            "Weapon release",
            [{ text: `${controllerCallsign}, ${callsign}, weapon away. Time to impact ${timeToImpactSeconds} seconds.` }],
            "impact",
            () => onSetAttackPhase("Weapon away")
          )}
        >
          7. Weapon Away
        </button>

        <button
          disabled={playing || sequenceStage !== "impact"}
          onClick={() => playSequence(
            "Impact and egress",
            [{ text: `${controllerCallsign}, ${callsign}, splash. Egress ${egress}.` }],
            "bda",
            () => onSetAttackPhase("Effects observed")
          )}
        >
          8. Splash / Egress
        </button>

        <button
          disabled={playing || !canSendBda}
          onClick={() => playSequence(
            "Aircraft BDA",
            [{ text: `${controllerCallsign}, ${callsign}, BDA. ${bdaEffect}. ${bdaText || "No further movement observed."}` }],
            "complete",
            onSendBda
          )}
        >
          9. Send BDA
        </button>

        <button
          disabled={playing || !["bda", "complete"].includes(sequenceStage)}
          onClick={() => playSequence(
            "Re-attack direction",
            [{ speaker: "controller", text: `${callsign}, ${controllerCallsign}, re-attack approved. Same target, same restrictions. Report ${ipBp} inbound.` }],
            "inbound",
            () => onSetAttackPhase("Re-attack required")
          )}
        >
          Re-attack
        </button>

        <button
          disabled={playing || !["bda", "complete"].includes(sequenceStage)}
          onClick={() => playSequence(
            "Attack complete",
            [{ speaker: "controller", text: `${callsign}, ${controllerCallsign}, copy BDA. No re-attack required. Remain this frequency.` }],
            "complete",
            () => onSetAttackPhase("Effects observed")
          )}
        >
          No Re-attack
        </button>

        {playing && <button onClick={stopPlayback}>Stop Radio</button>}
      </div>
    </section>
  );
}
