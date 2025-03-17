import * as vscode from "vscode";
import {
  getExistingClasses,
  getLastWord,
  getValidSuggestions,
  isInClassAttribute,
} from "../utilities/class.utils";

export function createCompletionProvider(
  classLookup: Map<string, boolean>
): vscode.Disposable {
  return vscode.languages.registerCompletionItemProvider(
    [
      { scheme: "file", language: "html" },
      { scheme: "file", language: "javascript" },
      { scheme: "file", language: "typescript" },
      { scheme: "file", language: "javascriptreact" },
      { scheme: "file", language: "typescriptreact" },
    ],
    {
      provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position
      ) {
        const linePrefix = document
          .lineAt(position)
          .text.substring(0, position.character);

        if (linePrefix.trim().startsWith("import ")) {
          return [];
        }

        const inClassContext = isInClassAttribute(linePrefix);

        if (!inClassContext) {
          return [];
        }
        
        const existingClasses = getExistingClasses(linePrefix);
        const lastWord = getLastWord(linePrefix);
        const validSuggestions = getValidSuggestions(
          classLookup,
          existingClasses,
          lastWord
        );

        const suggestions = validSuggestions.map((cls) => {
          const item = new vscode.CompletionItem(
            cls,
            vscode.CompletionItemKind.Value
          );
          // Add documentation to the completion item (Basic for now)
          item.documentation = new vscode.MarkdownString(
            `Oracle JET class: \`${cls}\``
          );
          return item;
        });

        return suggestions;
      },
    },
    " ",
    '"',
    "'"
  );
}
