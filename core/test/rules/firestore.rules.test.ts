import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, Timestamp, updateDoc, where } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

let env: RulesTestEnvironment;

const OWNER = "owner-uid";
const STRANGER = "stranger-uid";
const DEVICE = "device-uid"; // the Firebase Auth identity the physical panel signs in as

beforeAll(async () => {
  const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080").split(":");
  env = await initializeTestEnvironment({
    projectId: "demo-helianthic",
    firestore: {
      rules: readFileSync(join(__dirname, "..", "..", "..", "firestore.rules"), "utf8"),
      host,
      port: Number(port),
    },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  // Seed: a device registered to OWNER that authenticates as DEVICE.
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "devices/panel-1"), { ownerUid: OWNER, authUid: DEVICE, name: "Roof model" });
  });
});

const db = (uid?: string) => (uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore());
const goodReading = () => ({ deviceId: "panel-1", timestamp: Timestamp.now(), voltage: 5.1, current: 0.42 });

describe("analyses", () => {
  it("denies unauthenticated access", async () => {
    await assertFails(getDoc(doc(db(), "analyses/a1")));
    await assertFails(setDoc(doc(db(), "analyses/a1"), { ownerUid: OWNER }));
  });
  it("lets the owner create and read, and blocks others", async () => {
    await assertSucceeds(setDoc(doc(db(OWNER), "analyses/a1"), { ownerUid: OWNER, address: "x" }));
    await assertSucceeds(getDoc(doc(db(OWNER), "analyses/a1")));
    await assertFails(getDoc(doc(db(STRANGER), "analyses/a1")));
  });
  it("blocks creating an analysis owned by someone else", async () => {
    await assertFails(setDoc(doc(db(STRANGER), "analyses/a2"), { ownerUid: OWNER }));
  });
  it("blocks reassigning ownership on update", async () => {
    await setDoc(doc(db(OWNER), "analyses/a1"), { ownerUid: OWNER });
    await assertFails(updateDoc(doc(db(OWNER), "analyses/a1"), { ownerUid: STRANGER }));
  });
});

describe("sensorReadings", () => {
  it("accepts a valid reading from the registered device", async () => {
    await assertSucceeds(addDoc(collection(db(DEVICE), "sensorReadings"), goodReading()));
  });
  it("accepts optional fields within range", async () => {
    await assertSucceeds(
      addDoc(collection(db(DEVICE), "sensorReadings"), { ...goodReading(), power: 2.14, temperature: 31, lightLevel: 800 }),
    );
  });
  it("rejects unauthenticated and unrelated users", async () => {
    await assertFails(addDoc(collection(db(), "sensorReadings"), goodReading()));
    await assertFails(addDoc(collection(db(STRANGER), "sensorReadings"), goodReading()));
  });
  it("rejects the owner's own app account writing readings", async () => {
    await assertFails(addDoc(collection(db(OWNER), "sensorReadings"), goodReading()));
  });
  it("rejects impossible values", async () => {
    await assertFails(addDoc(collection(db(DEVICE), "sensorReadings"), { ...goodReading(), voltage: 500 }));
    await assertFails(addDoc(collection(db(DEVICE), "sensorReadings"), { ...goodReading(), current: -1 }));
    await assertFails(addDoc(collection(db(DEVICE), "sensorReadings"), { ...goodReading(), temperature: 900 }));
  });
  it("rejects wrong types and missing required fields", async () => {
    await assertFails(addDoc(collection(db(DEVICE), "sensorReadings"), { ...goodReading(), voltage: "5.1" }));
    const { current: _omit, ...noCurrent } = goodReading();
    await assertFails(addDoc(collection(db(DEVICE), "sensorReadings"), noCurrent));
  });
  it("rejects unknown fields", async () => {
    await assertFails(addDoc(collection(db(DEVICE), "sensorReadings"), { ...goodReading(), note: "hi" }));
  });
  it("rejects timestamps far in the future", async () => {
    const future = Timestamp.fromMillis(Date.now() + 60 * 60 * 1000);
    await assertFails(addDoc(collection(db(DEVICE), "sensorReadings"), { ...goodReading(), timestamp: future }));
  });
  it("makes readings immutable", async () => {
    const ref = await addDoc(collection(db(DEVICE), "sensorReadings"), goodReading());
    await assertFails(updateDoc(ref, { voltage: 6 }));
    await assertFails(deleteDoc(ref));
  });
  it("lets only the device owner read readings", async () => {
    await addDoc(collection(db(DEVICE), "sensorReadings"), goodReading());
    // Rules can only evaluate a list query that is constrained by deviceId.
    const q = (uid: string) => query(collection(db(uid), "sensorReadings"), where("deviceId", "==", "panel-1"));
    await assertSucceeds(getDocs(q(OWNER)));
    await assertFails(getDocs(q(STRANGER)));
  });
});

describe("devices", () => {
  it("lets the owner register a device and blocks strangers from reading it", async () => {
    await assertSucceeds(setDoc(doc(db(OWNER), "devices/panel-2"), { ownerUid: OWNER, authUid: "x" }));
    await assertFails(getDoc(doc(db(STRANGER), "devices/panel-1")));
  });
});
