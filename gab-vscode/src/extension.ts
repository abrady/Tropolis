import * as vscode from 'vscode';
import { parseGab, validateGab } from './gab-utils';

function refreshDiagnostics(doc: vscode.TextDocument, collection: vscode.DiagnosticCollection) {
  if (doc.languageId !== 'gab') return;
  const diagnostics: vscode.Diagnostic[] = [];
  const text = doc.getText();
  try {
    const nodes = parseGab(text);
    const start = nodes[0]?.title || '';
    const result = validateGab(nodes, start);
    const lines = text.split(/\r?\n/);
    const findLine = (title: string): number => {
      return lines.findIndex(l => l.startsWith('title:') && l.includes(title));
    };
    for (const t of result.unreachable) {
      const line = findLine(t);
      if (line !== -1) {
        const range = new vscode.Range(line, 0, line, lines[line].length);
        diagnostics.push(new vscode.Diagnostic(range, `Unreachable node: ${t}`, vscode.DiagnosticSeverity.Warning));
      }
    }
    for (const t of result.nonterminating) {
      const line = findLine(t);
      if (line !== -1) {
        const range = new vscode.Range(line, 0, line, lines[line].length);
        diagnostics.push(new vscode.Diagnostic(range, `Non-terminating node: ${t}`, vscode.DiagnosticSeverity.Warning));
      }
    }
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    diagnostics.push(new vscode.Diagnostic(new vscode.Range(0,0,0,1), msg, vscode.DiagnosticSeverity.Error));
  }
  collection.set(doc.uri, diagnostics);
}

export function activate(context: vscode.ExtensionContext) {
  const collection = vscode.languages.createDiagnosticCollection('gab');
  context.subscriptions.push(collection);

  if (vscode.window.activeTextEditor) {
    refreshDiagnostics(vscode.window.activeTextEditor.document, collection);
  }

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(doc => refreshDiagnostics(doc, collection)),
    vscode.workspace.onDidChangeTextDocument(e => refreshDiagnostics(e.document, collection))
  );
}

export function deactivate() {}
