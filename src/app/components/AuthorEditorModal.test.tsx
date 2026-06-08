import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AuthorEditorModal from "./AuthorEditorModal";
import { Author } from "../types/Author";

class MockPointerEvent extends MouseEvent {
  pointerId: number;

  constructor(type: string, props: PointerEventInit = {}) {
    super(type, props);
    this.pointerId = props.pointerId ?? 0;
  }
}

global.PointerEvent = MockPointerEvent as typeof PointerEvent;

jest.mock("react-hot-toast", () => ({
  error: jest.fn(),
  success: jest.fn(),
}));

jest.mock("../lib/authorProfile", () => {
  const defaultCrop = { centerX: 50, centerY: 25, zoom: 1 };
  const clamp = (value: number) => Math.min(Math.max(value, 0), 100);
  const normalizeAuthorImageCrop = (author?: {
    imageCropX?: number;
    imageCropY?: number;
    imageCropZoom?: number;
  }) => ({
    centerX: author?.imageCropX ?? defaultCrop.centerX,
    centerY: author?.imageCropY ?? defaultCrop.centerY,
    zoom: author?.imageCropZoom ?? defaultCrop.zoom,
  });

  return {
    DEFAULT_AUTHOR_IMAGE_CROP: defaultCrop,
    buildImageProxyUrl: (url: string) =>
      `/api/fetch-image?url=${encodeURIComponent(url)}`,
    getAuthorImageCropWindow: (
      dimensions: { width: number; height: number },
      crop: { centerX: number; centerY: number; zoom: number },
    ) => ({
      normalizedCrop: normalizeAuthorImageCrop({
        imageCropX: crop.centerX,
        imageCropY: crop.centerY,
        imageCropZoom: crop.zoom,
      }),
      size: Math.min(dimensions.width, dimensions.height),
      sx: 0,
      sy: 0,
    }),
    inferImageSource: (author: { imageSource?: string; profile_url?: string }) =>
      author.imageSource ?? (author.profile_url ? "upload" : null),
    moveAuthorImageCrop: ({
      crop,
      deltaX,
      deltaY,
      frameSize,
    }: {
      crop: { centerX: number; centerY: number; zoom: number };
      deltaX: number;
      deltaY: number;
      frameSize: number;
    }) => ({
      ...crop,
      centerX: clamp(crop.centerX - (deltaX / frameSize) * 100),
      centerY: clamp(crop.centerY - (deltaY / frameSize) * 100),
    }),
    normalizeAuthorImageCrop,
    resolvePastedAuthorImage: jest.fn(),
  };
});

describe("AuthorEditorModal", () => {
  const author: Author = {
    id: "author-1",
    name: "Maya Angelou",
    profile_url: "https://example.com/maya.jpg",
    imageCropX: 50,
    imageCropY: 50,
    imageCropZoom: 1,
  };

  it("saves crop changes from dragging the photo preview", async () => {
    const onSave = jest.fn();

    render(
      <AuthorEditorModal
        author={author}
        isOpen
        onClose={jest.fn()}
        onSave={onSave}
      />,
    );

    expect(screen.queryByLabelText(/horizontal/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/vertical/i)).not.toBeInTheDocument();

    const editor = screen.getByTestId("author-photo-editor");
    Object.defineProperty(editor, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        bottom: 200,
        height: 200,
        left: 0,
        right: 200,
        top: 0,
        width: 200,
        x: 0,
        y: 0,
        toJSON: () => null,
      }),
    });

    const image = screen.getByAltText("Maya Angelou preview");
    Object.defineProperty(image, "naturalWidth", {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(image, "naturalHeight", {
      configurable: true,
      value: 800,
    });
    fireEvent.load(image);

    await waitFor(() => expect(editor).toHaveClass("cursor-grab"));

    fireEvent.pointerDown(editor, {
      clientX: 100,
      clientY: 100,
      pointerId: 3,
    });
    fireEvent.pointerMove(editor, {
      clientX: 120,
      clientY: 80,
      pointerId: 3,
    });
    fireEvent.pointerUp(editor, {
      clientX: 120,
      clientY: 80,
      pointerId: 3,
    });

    const saveButton = screen.getByRole("button", { name: /save/i });
    await waitFor(() => expect(saveButton).not.toBeDisabled());
    fireEvent.click(saveButton);

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].imageCrop).toMatchObject({
      centerX: 40,
      centerY: 60,
      zoom: 1,
    });
  });
});
