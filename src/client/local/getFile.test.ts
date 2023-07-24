import fs from "fs";
import { getFileLocal } from "./getFile";

describe("getFileLocal", () => {
  const mockedContents = "dummy text";
  const mockedReadFileSync = jest
    .spyOn(fs, "readFileSync")
    .mockReturnValue("dummy text");
  beforeAll(() => {
    jest.spyOn(fs, "existsSync").mockReturnValue(true);
  });

  it("returns the contents of the file found in the configured transactions directory", async () => {
    const fileName = "my-file.txt";
    const result = await getFileLocal(fileName);
    const expectedCall = [expect.stringContaining(fileName), "utf-8"];

    expect(mockedReadFileSync.mock.calls).toMatchObject(
      expect.arrayContaining([expect.arrayContaining(expectedCall)])
    );
    expect(result).toMatch(mockedContents);
  });
});
