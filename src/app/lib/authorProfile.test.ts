jest.mock("@langchain/google-genai", () => ({
  ChatGoogleGenerativeAI: jest.fn(),
}));

jest.mock("firebase/storage", () => ({
  deleteObject: jest.fn(),
  getDownloadURL: jest.fn(),
  ref: jest.fn(),
  uploadBytes: jest.fn(),
}));

jest.mock("./firebase", () => ({
  storage: {},
}));

import { moveAuthorImageCrop } from "./authorProfile";

describe("author image crop movement", () => {
  it("moves the saved crop opposite the pointer drag, like moving the photo", () => {
    const nextCrop = moveAuthorImageCrop({
      crop: { centerX: 50, centerY: 50, zoom: 2 },
      dimensions: { width: 1000, height: 800 },
      frameSize: 250,
      deltaX: 100,
      deltaY: -50,
    });

    expect(nextCrop.centerX).toBeLessThan(50);
    expect(nextCrop.centerY).toBeGreaterThan(50);
    expect(nextCrop.zoom).toBe(2);
  });

  it("leaves an axis alone when the image has no spare area to move", () => {
    const crop = { centerX: 50, centerY: 25, zoom: 1 };

    expect(
      moveAuthorImageCrop({
        crop,
        dimensions: { width: 600, height: 600 },
        frameSize: 300,
        deltaX: 80,
        deltaY: 80,
      }),
    ).toEqual(crop);
  });
});
