import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import {
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    "AIzaSyCyyq3SmZWemrY8baqu_Q33RC7oboCfMfk",
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    "vintage-tacp-trainer.firebaseapp.com",
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID || "vintage-tacp-trainer",
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    "1:110373279046:web:c1beb97414f29cab31c147",
};

export const linkedModeConfigured = Object.values(firebaseConfig).every(Boolean);

let services;

function getServices() {
  if (!linkedModeConfigured) {
    throw new Error("Linked mode has not been configured yet.");
  }
  if (!services) {
    const app = initializeApp(firebaseConfig);
    services = { auth: getAuth(app), db: getFirestore(app) };
  }
  return services;
}

export async function ensureLinkedAuth() {
  const { auth } = getServices();
  if (auth.currentUser) return auth.currentUser;
  await signInAnonymously(auth);
  if (auth.currentUser) return auth.currentUser;
  return new Promise((resolve, reject) => {
    const stop = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      stop();
      resolve(user);
    }, reject);
  });
}

function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () =>
    alphabet[Math.floor(Math.random() * alphabet.length)]
  ).join("");
}

export async function createLinkedSession(initialState) {
  const user = await ensureLinkedAuth();
  const { db } = getServices();
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = makeCode();
    const reference = doc(db, "linkedSerials", code);
    if ((await getDoc(reference)).exists()) continue;
    await setDoc(reference, {
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      hostUid: user.uid,
      status: "live",
      state: initialState,
    });
    return code;
  }
  throw new Error("Could not create a unique session code. Please try again.");
}

export async function joinLinkedSession(code) {
  await ensureLinkedAuth();
  const { db } = getServices();
  const cleanCode = code.trim().toUpperCase();
  const snapshot = await getDoc(doc(db, "linkedSerials", cleanCode));
  if (!snapshot.exists() || snapshot.data().status === "ended") {
    throw new Error("That session code was not found or has ended.");
  }
  return { code: cleanCode, state: snapshot.data().state };
}

export function watchLinkedSession(code, onState, onError) {
  const { db } = getServices();
  return onSnapshot(doc(db, "linkedSerials", code), (snapshot) => {
    if (!snapshot.exists()) return;
    const data = snapshot.data();
    onState(data.state, data.status);
  }, onError);
}

export async function publishLinkedState(code, state) {
  const { db } = getServices();
  await updateDoc(doc(db, "linkedSerials", code), {
    state,
    updatedAt: serverTimestamp(),
  });
}

export async function endLinkedSession(code) {
  const { db } = getServices();
  await updateDoc(doc(db, "linkedSerials", code), {
    status: "ended",
    updatedAt: serverTimestamp(),
  });
}
