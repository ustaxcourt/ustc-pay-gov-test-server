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
    const result = await showScript(mockAppContext, { file: "override-links.js" });
    expect(mockGetFile).toHaveBeenCalledWith(mockAppContext, "html/scripts/override-links.js");
    expect(result).toBe("console.log('ok');");
  });

  it("throws for missing filename", async () => {
    await expect(showScript(mockAppContext, { file: "" }))
      .rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError for invalid filename", async () => {
    await expect(showScript(mockAppContext, { file: "../evil.js" }))
      .rejects.toThrow(NotFoundError);
    await expect(showScript(mockAppContext, { file: "foo.txt" }))
      .rejects.toThrow(NotFoundError);
    await expect(showScript(mockAppContext, { file: "foo.js" }))
      .rejects.toThrow(NotFoundError);
  });
});
