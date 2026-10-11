import { useEffect, useRef, useState } from "react";
import { getStableRadioVoice } from "../utils/radioVoiceAssignments.js";
import {
  createAttackHeadingCall,
  getHeadingCallDelayMs,
} from "../utils/attackHeadingCall.js";
import {
  createWeaponReleaseCall,
  getWeaponReleaseDelayMs,
} from "../utils/weaponReleaseCall.js";

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
  canSendBda,
  bdaEffect,
  bdaText,
  onMarkReadback,
  onSetAttackPhase,
  onSendBda,
  autoStartReadback = false,
}) {
  const [playing, setPlaying] = useState(false);
  const [currentCall, setCurrentCall] = useState("Standby");
  const [lastBdaTransmission, setLastBdaTransmission] = useState("");
  const [sequenceStage, setSequenceStage] = useState("tasking");
  const [headingCallPending, setHeadingCallPending] = useState(false);
  const [weaponReleasePending, setWeaponReleasePending] = useState(false);
  const audioRef = useRef(null);
  const bedRef = useRef(null);
  const headingCallTimerRef = useRef(null);
  const weaponReleaseTimerRef = useRef(null);
  const impactCallTimerRef = useRef(null);
  const bdaReadyTimerRef = useRef(null);
  const autoReadbackStartedRef = useRef(false);
  const autoReadbackDetailsRef = useRef(null);
  const impactDetailsRef = useRef(null);
  impactDetailsRef.current = {
    controllerCallsign,
    callsign: platform?.callsign || "aircraft",
    egress: brief?.egress || "as directed",
    onSetAttackPhase,
    playSequence,
  };

  useEffect(
    () => () => {
      window.clearTimeout(headingCallTimerRef.current);
      window.clearTimeout(weaponReleaseTimerRef.current);
      window.clearTimeout(impactCallTimerRef.current);
      window.clearTimeout(bdaReadyTimerRef.current);
      stopPlayback();
    },
    []
  );
  useEffect(() => {
    window.clearTimeout(headingCallTimerRef.current);
    window.clearTimeout(weaponReleaseTimerRef.current);
    window.clearTimeout(impactCallTimerRef.current);
    window.clearTimeout(bdaReadyTimerRef.current);
    setSequenceStage("tasking");
    setCurrentCall("Standby");
    setLastBdaTransmission("");
    setHeadingCallPending(false);
    setWeaponReleasePending(false);
    autoReadbackStartedRef.current = false;
  }, [platform?.callsign, target?.id]);
  useEffect(() => {
    if (attackStatus.phase === "On station") {
      setSequenceStage("tasking");
      setCurrentCall("Standby");
    }
  }, [attackStatus.phase]);
  useEffect(() => {
    if (["Abort", "Dry / no drop", "On station"].includes(attackStatus.phase)) {
      window.clearTimeout(weaponReleaseTimerRef.current);
      window.clearTimeout(impactCallTimerRef.current);
      window.clearTimeout(bdaReadyTimerRef.current);
      setWeaponReleasePending(false);
    }
  }, [attackStatus.phase]);

  useEffect(() => {
    if (
      canSendBda &&
      attackStatus.phase === "Effects observed" &&
      !["complete", "bdaReady"].includes(sequenceStage)
    ) {
      setSequenceStage("bdaReady");
    }
  }, [attackStatus.phase, canSendBda, sequenceStage]);

  useEffect(() => {
    if (attackStatus.phase !== "Weapon away" || !attackStatus.weaponImpactAt) return;

    window.clearTimeout(impactCallTimerRef.current);
    impactCallTimerRef.current = window.setTimeout(
      async () => {
        const details = impactDetailsRef.current;
        const bdaReadyAt = Date.now() + 15000;
        await details.playSequence(
          "Weapon impact",
          [{ text: `${details.controllerCallsign}, ${details.callsign}, splash. Egress ${details.egress}.` }],
          "bdaWait",
          () => details.onSetAttackPhase("Effects observed")
        );

        bdaReadyTimerRef.current = window.setTimeout(() => {
          const readyDetails = impactDetailsRef.current;
          readyDetails.playSequence(
            "Aircraft ready for BDA",
            [{ text: `${readyDetails.controllerCallsign}, ${readyDetails.callsign}, ready for BDA.` }],
            "bdaReady"
          );
        }, Math.max(0, bdaReadyAt - Date.now()));
      },
      Math.max(0, attackStatus.weaponImpactAt - Date.now())
    );

    return () => window.clearTimeout(impactCallTimerRef.current);
  }, [attackStatus.phase, attackStatus.weaponImpactAt]);

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
    const voiceKey = speaker === "controller"
      ? `CONTROLLER::${controllerCallsign}`
      : platform.radioVoiceKey || `${platform.id}::${platform.callsign}`;

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
      utterance.voice = getStableRadioVoice(
        window.speechSynthesis.getVoices(),
        voiceKey
      );
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
    } catch (error) {
      console.warn("Mission radio call failed", error);
      alert("Mission radio could not play. Check the speech service and try again.");
    } finally {
      if (nextStage) setSequenceStage(nextStage);
      stopPlayback();
    }
  }

  function queueHeadingCall() {
    window.clearTimeout(headingCallTimerRef.current);
    const delayMs = getHeadingCallDelayMs();
    const call = createAttackHeadingCall(heading);
    setHeadingCallPending(true);
    setCurrentCall("Aircraft pushing — awaiting heading call");

    headingCallTimerRef.current = window.setTimeout(() => {
      setHeadingCallPending(false);
      playSequence(
        "Aircraft heading call",
        [
          {
            text: `${controllerCallsign}, ${callsign}, in, heading ${call.heading}.`,
          },
        ],
        "clearance",
        () => onSetAttackPhase("In hot")
      );
    }, delayMs);
  }

  function queueWeaponRelease() {
    window.clearTimeout(weaponReleaseTimerRef.current);
    const delayMs = getWeaponReleaseDelayMs(platform?.aircraft);
    const releaseCall = createWeaponReleaseCall(platform?.ordnance);
    setWeaponReleasePending(true);
    setCurrentCall("Aircraft attacking — awaiting weapon release");

    weaponReleaseTimerRef.current = window.setTimeout(() => {
      setWeaponReleasePending(false);
      playSequence(
        "Weapon release",
        [{ text: `${controllerCallsign}, ${callsign}, ${releaseCall}.` }],
        "impact",
        () => onSetAttackPhase("Weapon away")
      );
    }, delayMs);
  }

  async function clearAircraftHot() {
    await playSequence(
      "Cleared hot",
      [{ speaker: "controller", text: `${callsign}, ${controllerCallsign}, cleared hot.` }],
      "weapon",
      () => onSetAttackPhase("Cleared hot")
    );
    queueWeaponRelease();
  }

  async function completeCorrectReadback(calls) {
    await playSequence(
      "Correct 9-Line readback",
      calls,
      "awaitingHeading",
      () => {
        onMarkReadback("Correct");
        onSetAttackPhase("IP inbound");
      }
    );
    queueHeadingCall();
  }

  const callsign = platform?.callsign || "aircraft";
  const targetId = target?.id || "target";
  const elevation = getLine(lines, 4);
  const location = getLine(lines, 6);
  const heading = getLine(lines, 2);
  const restrictions = brief?.restrictions || "no additional restrictions";
  const ipBp = brief?.ipBp || "current hold";
  const fullNineLine = (lines || [])
    .map(([number, , value]) => `Line ${number}, ${value || "unknown"}.`)
    .join(" ");
  const bdaTransmission = `${controllerCallsign}, ${callsign}, BDA. ${bdaEffect}. ${bdaText || "No further movement observed."}`;
  autoReadbackDetailsRef.current = {
    controllerCallsign,
    callsign,
    elevation,
    location,
    restrictions,
    playSequence,
  };

  useEffect(() => {
    if (
      !autoStartReadback ||
      !briefReady ||
      autoReadbackStartedRef.current ||
      sequenceStage !== "tasking"
    ) {
      return;
    }

    autoReadbackStartedRef.current = true;
    const details = autoReadbackDetailsRef.current;
    details.playSequence(
      "Aircraft 9-Line readback",
      [
        {
          text: `${details.controllerCallsign}, ${details.callsign}, readback. Elevation ${details.elevation}. Target location ${details.location}. Restrictions ${details.restrictions}.`,
        },
      ],
      "readback"
    );
  }, [autoStartReadback, briefReady, sequenceStage]);

  async function deliverBda() {
    setLastBdaTransmission(bdaTransmission);
    await playSequence(
      "Ready BDA",
      [
        { speaker: "controller", text: `${callsign}, ${controllerCallsign}, ready BDA.` },
        { text: bdaTransmission },
      ],
      "complete"
    );
    onSendBda();
  }
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
          onClick={() => completeCorrectReadback(
            [
              { speaker: "controller", text: `${callsign}, ${controllerCallsign}, readback correct. Push when able.` },
            ]
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
          onClick={() => completeCorrectReadback(
            [
              { speaker: "controller", text: `${callsign}, ${controllerCallsign}, negative. Correction line six, ${location}. Read back.` },
              { text: `${controllerCallsign}, ${callsign}, line six ${location}.` },
              { speaker: "controller", text: `${callsign}, ${controllerCallsign}, readback correct. Push when able.` },
            ]
          )}
        >
          Correct Readback
        </button>

        {headingCallPending && (
          <span className="statusPill receiving">AIRCRAFT PUSHING</span>
        )}

        <button
          disabled={playing || sequenceStage !== "clearance"}
          onClick={clearAircraftHot}
        >
          4. Cleared Hot
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

        {weaponReleasePending && (
          <span className="statusPill receiving">ATTACK RUN — AWAITING RELEASE</span>
        )}
        {sequenceStage === "impact" && (
          <span className="statusPill receiving">WEAPON IN FLIGHT</span>
        )}
        {sequenceStage === "bdaWait" && (
          <span className="statusPill receiving">ASSESSING EFFECTS</span>
        )}
        {sequenceStage === "bdaReady" && (
          <span className="statusPill ready">AIRCRAFT READY FOR BDA</span>
        )}

        <button
          disabled={playing || !canSendBda || sequenceStage !== "bdaReady"}
          onClick={deliverBda}
        >
          5. Ready BDA
        </button>

        <button
          disabled={playing || !lastBdaTransmission}
          onClick={() =>
            playSequence(
              "Replay aircraft BDA",
              [{ text: lastBdaTransmission }]
            )
          }
        >
          Replay BDA Voice
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
