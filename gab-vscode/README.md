To try the extension locally:

From the gab-vscode folder, install dependencies and build the bundled JavaScript:

- npm install
- npm run compile

(The build script compiles the TypeScript sources into dist/extension.js.)

Package it into a VSIX:

- npx vsce package

This generates gab-language-0.0.1.vsix in the same folder.

In VS Code, open the command palette and choose Extensions: Install from VSIX…, select the generated file, and restart VS Code.

Open any .gab file. The extension activates automatically for the gab language and adds a TextMate grammar that highlights keywords like speaker, title, the -> arrow, and <<commands>> blocks.

On document open or change, the extension runs parseGab and validateGab to surface warnings for unreachable or non‑terminating nodes via Diagnostic objects
