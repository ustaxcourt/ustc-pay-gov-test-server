import fs from "fs";
import path from "path";

const listFilesRecursively = (rootDir: string, currentDir = rootDir) => {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...listFilesRecursively(rootDir, fullPath));
      continue;
    }

    files.push(path.relative(rootDir, fullPath));
  }

  return files.sort();
};

describe("static assets sync", () => {
  it("keeps src/static/html and terraform/static/html in sync", () => {
    const workspaceRoot = path.resolve(__dirname, "../..");
    const srcStaticDir = path.join(workspaceRoot, "src/static/html");
    const terraformStaticDir = path.join(workspaceRoot, "terraform/static/html");

    const srcFiles = listFilesRecursively(srcStaticDir);
    const terraformFiles = listFilesRecursively(terraformStaticDir);

    expect(terraformFiles).toEqual(srcFiles);

    for (const relativePath of srcFiles) {
      const srcFilePath = path.join(srcStaticDir, relativePath);
      const terraformFilePath = path.join(terraformStaticDir, relativePath);

      const srcContent = fs.readFileSync(srcFilePath, "utf-8");
      const terraformContent = fs.readFileSync(terraformFilePath, "utf-8");

      expect(terraformContent).toBe(srcContent);
    }
  });
});
