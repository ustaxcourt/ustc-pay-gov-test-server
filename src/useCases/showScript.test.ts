import { NotFoundError } from "../errors/NotFoundError";
import { showScript } from "./showScript";

describe("showScript", () => {
  const mockGetFile = jest.fn();
  const mockAppContext = {
    storageClient: () => ({
      getFile: mockGetFile,
    }),
  } as any;

  beforeEach(() => {
    mockGetFile.mockReset();
  });

  it("returns script content for a valid filename", async () => {
    mockGetFile.mockResolvedValue("console.log('ok');");
    const result = await showScript(mockAppContext, {
      file: "override-links.js",
    });
    expect(mockGetFile).toHaveBeenCalledWith(
      mockAppContext,
      "html/scripts/override-links.js",
    );
    expect(result).toBe("console.log('ok');");
  });

  it("throws for missing filename", async () => {
    await expect(showScript(mockAppContext, { file: "" })).rejects.toThrow(
      NotFoundError,
    );
  });

  it("throws NotFoundError for invalid filename", async () => {
    await expect(
      showScript(mockAppContext, { file: "../evil.js" }),
    ).rejects.toThrow(NotFoundError);
    await expect(
      showScript(mockAppContext, { file: "foo.txt" }),
    ).rejects.toThrow(NotFoundError);
    await expect(
      showScript(mockAppContext, { file: "foo.js" }),
    ).rejects.toThrow(NotFoundError);
  });

  it("maps storage-layer not found to NotFoundError", async () => {
    const error = new Error("No such file");
    (error as any).code = "ENOENT";
    mockGetFile.mockRejectedValue(error);

    await expect(
      showScript(mockAppContext, { file: "override-links.js" }),
    ).rejects.toThrow(NotFoundError);
  });

  it("rethrows unexpected storage errors", async () => {
    const error = new Error("S3 is unavailable");
    mockGetFile.mockRejectedValue(error);

    await expect(
      showScript(mockAppContext, { file: "override-links.js" }),
    ).rejects.toThrow("S3 is unavailable");
  });
});
