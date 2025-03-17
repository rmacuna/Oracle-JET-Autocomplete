import * as vscode from "vscode";

import { createCompletionProvider } from "./providers/completion.provider";
import { isOracleJetProject, loadUtilityClasses } from "./utilities/file.utils";


function createClassLookup(classes: string[]): Map<string, boolean> {
  return new Map(classes.map((cls) => [cls, true]));
}

export async function activate(context: vscode.ExtensionContext) {
	const isJetProject = await isOracleJetProject();

  if (!isJetProject) {
    console.log('Oracle JET project not detected');
    return;
  }

	// vscode.commands.executeCommand(
  //   "setContext",
  //   "oraclejet-intellisense.active",
  //   true
  // );

  const ojetUtilityClasses = await loadUtilityClasses(context);
  const classLookup = createClassLookup(ojetUtilityClasses);

	context.subscriptions.push(createCompletionProvider(classLookup));
}


vscode.workspace.onDidChangeConfiguration((event) => {
  if (event.affectsConfiguration("myExtension.enableFeature")) {
    vscode.window.showInformationMessage(
      "Oracle JET IntelliSense settings updated."
    );
    // Reload settings dynamically
  }
});

export function deactivate() {
  vscode.commands.executeCommand(
    "setContext",
    "oraclejet-intellisense.active",
    false
  );
}
