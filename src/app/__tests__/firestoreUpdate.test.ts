/**
 * Desired behaviour for Firestore updates in this project
 * ------------------------------------------------------------------
 * 1. updateDocument should call firebase updateDoc exactly once.
 *    We use the native update primitive because the document is guaranteed to
 *    exist (the UI was populated by a previous read). A failing promise should
 *    bubble up — we do **NOT** silently create new docs.
 *
 * 2. Undefined values must be stripped before the call so Firestore never
 *    receives `undefined` (which throws).
 *
 * 3. Optional fields may be sent as null or omitted. In either case they should
 *    not blow up.
 */

import { updateDocument } from "../lib/firebaseCrud";

// --- mock firestore ---
jest.mock("firebase/firestore", () => ({
  updateDoc: jest.fn(() => Promise.resolve()),
  doc: jest.fn(() => ({ path: "mock/path" })),
}));

jest.mock("../lib/firebase", () => ({ getFirestoreDb: jest.fn(() => ({})) }));

const { updateDoc } = require("firebase/firestore");

describe("Firestore update helper (desired API)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("uses updateDoc exactly once and never setDoc", async () => {
    const id = "quote-123";
    const data = { author: "Alice", videoLink: undefined } as any;

    await updateDocument("quotes", id, data);

    expect(updateDoc).toHaveBeenCalledTimes(1);
    // should never be called with undefined inside payload
    const payload = updateDoc.mock.calls[0][1];
    expect(payload).not.toHaveProperty("videoLink");
  });
});
