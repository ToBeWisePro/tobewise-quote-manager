/**
 * Ensures that the Firestore document ID is preserved when reading collections.
 * If the stored document data also contains an `id` field, the SDK doc.id should
 * take precedence – otherwise subsequent update/delete calls will target a
 * non-existent document path.
 */

import { readDocuments } from "../lib/firebaseCrud";

// ----------------------------- mocks ---------------------------------------

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  query: jest.fn(),
  getDocs: jest.fn(),
}));

jest.mock("../lib/firebase", () => ({
  // The CRUD util only needs `getFirestoreDb` to return something truthy.
  getFirestoreDb: jest.fn(() => ({})),
}));

const { getDocs } = require("firebase/firestore");

describe("readDocuments", () => {
  it("uses the Firestore doc.id instead of any `id` field inside the document data", async () => {
    const mockSnap = {
      docs: [
        {
          id: "firestore-123",
          data: () => ({
            id: "embedded-id-456",
            author: "Alice",
          }),
        },
      ],
    };

    getDocs.mockResolvedValue(mockSnap);

    const results = await readDocuments<any>("quotes");

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("firestore-123");
  });
});
