import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";

/**
 * Loads utility classes from JSON file
 * @param context - The extension context
 * @returns Array of OJET utility class names
 */
export async function loadUtilityClasses(
  context: vscode.ExtensionContext
): Promise<string[]> {
  try {
    const jsonPath = path.join(context.extensionPath, "utility-ojet.json");
    const jsonContent = await fs.readFile(jsonPath, "utf8");
    const utilityClasses = JSON.parse(jsonContent);
    return Array.isArray(utilityClasses) ? utilityClasses : [];
  } catch (error) {
    console.error("Failed to load OJET utility classes from JSON:", error);
    return [];
  }
}

/**
 * Checks if the current workspace is an Oracle JET project
 * @returns True if the current workspace is an Oracle JET project
 */
export async function isOracleJetProject(): Promise<boolean> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return false;
  }

  for (const folder of workspaceFolders) {
    const configPath = path.join(folder.uri.fsPath, 'oraclejetconfig.json');
    try {
      await fs.access(configPath, fs.constants.F_OK);
      return true;
    } catch (err) {
      // File doesn't exist in this folder
    }
  }
  
  return false;
}
