import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Loads utility classes from JSON file
 * @param context - The extension context
 * @returns Array of OJET utility class names
 */
function loadUtilityClasses(context: vscode.ExtensionContext): string[] {
	try {
		const jsonPath = path.join(context.extensionPath, 'utility-ojet.json');
		const jsonContent = fs.readFileSync(jsonPath, 'utf8');
		const utilityClasses = JSON.parse(jsonContent);

		if (Array.isArray(utilityClasses)) {
			return utilityClasses;
		}

		console.error('Invalid JSON format for OJET utility classes. Expected an array.');
		return [];
	} catch (error) {
		console.error('Failed to load OJET utility classes from JSON:', error);
		return [];
	}
}

/** Rules for Validation */
const validationRules = {
	/* Certain classes shouldn't be used together: Here is a basic setup  */
	mutuallyExclusive: [
		['oj-sm-flex', 'oj-md-flex', 'oj-lg-flex'],
		['oj-sm-padding-1x', 'oj-sm-padding-2x']
	],
};

export function activate(context: vscode.ExtensionContext) {
	const ojetUtilityClasses = loadUtilityClasses(context);

	const htmlSelector = { scheme: 'file', language: 'html' };
	const jsSelector = { scheme: 'file', language: 'javascript' };
	const tsSelector = { scheme: 'file', language: 'typescript' };
	const jsxSelector = { scheme: 'file', language: 'javascriptreact' };
	const tsxSelector = { scheme: 'file', language: 'typescriptreact' };

	const provider = vscode.languages.registerCompletionItemProvider(
		[htmlSelector, jsSelector, tsSelector, jsxSelector, tsxSelector],
		{
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {

				// Get the current line text up to the cursor
				const linePrefix = document.lineAt(position).text.substring(0, position.character);

				// Only provide suggestions in class attributes for HTML, jSX and TSX 
				// or in string literals for JS/TS that look like they might be class names
				if (!isInClassContext(linePrefix)) {
					return undefined;
				}

				// Get existing classes in the current attribute
				const existingClasses = getExistingClasses(linePrefix);

				// Filter out suggestions based on what's already typed and validation rules
				const validSuggestions = getValidSuggestions(ojetUtilityClasses, existingClasses, linePrefix);

				// Create completion items for each valid suggestion
				return validSuggestions.map(className => {
					const completionItem = new vscode.CompletionItem(className, vscode.CompletionItemKind.Value);

					// Add documentation for the class
					completionItem.documentation = getDocumentationForClass(className);

					// For partial matches, we want to replace only what the user has started typing
					const lastWord = getLastWord(linePrefix);
					if (lastWord && className.startsWith(lastWord)) {
						completionItem.range = new vscode.Range(
							position.translate(0, -lastWord.length),
							position
						);
					}

					return completionItem;
				});
			}
		},
		' ', // Trigger completion after a space to suggest next class
		'\"', // Trigger after quote for class=""
		'\'' // Trigger after quote for class=''
	);

	context.subscriptions.push(provider);

	// Register a hover provider to show documentation when hovering over class names
	const hoverProvider = vscode.languages.registerHoverProvider(
		[htmlSelector, jsSelector, tsSelector, jsxSelector, tsxSelector],
		{
			provideHover(document, position, token) {
				const wordRange = document.getWordRangeAtPosition(position, /oj-[a-zA-Z0-9-]+/);
				if (!wordRange) {
					return null;
				}

				const word = document.getText(wordRange);

				if (ojetUtilityClasses.includes(word)) {
					return new vscode.Hover(getDocumentationForClass(word));
				}

				return null;
			}
		}
	);

	context.subscriptions.push(hoverProvider);
}

/**
 * Helper function to determine if we're in a class attribute or string that might contain classes
 * @param linePrefix - Current line text up to the cursor
 * @returns True if we're in a class context, false otherwise
 */
function isInClassContext(linePrefix: string): boolean {
	if (linePrefix.includes('class="') || linePrefix.includes("class='") || linePrefix.includes('className')) {
		return true;
	}

	// This is a basic check; we might need more sophisticated parsing
	const jsStringRegex = /(["'])[^"']*$/; // Matches an open quote with content after it

	if (jsStringRegex.test(linePrefix)) {
		return true;
	}

	return false;
}

/**
 *  Helper function to get existing classes from current attribute
 * @param linePrefix - Current line text up to the cursor
 * @returns Array of existing classes
 */
function getExistingClasses(linePrefix: string): string[] {
	let classMatch: RegExpMatchArray | null = null;

	// Match class="..." or class='...'
	if (linePrefix.includes('class="')) {
		classMatch = linePrefix.match(/class="([^"]*)$/);
	} else if (linePrefix.includes("class='")) {
		classMatch = linePrefix.match(/class='([^']*)$/);
	} else if (linePrefix.includes('className')) {
		classMatch = linePrefix.match(/className="([^"]*)$/);
	} else {
		// For JS/TS strings, try to extract what might be classes
		classMatch = linePrefix.match(/["']([^"']*)$/);
	}

	if (!classMatch || !classMatch[1]) {
		return [];
	}

	return classMatch[1].trim().split(/\s+/).filter(c => c.length > 0);
}

/**
 * Helper to get the last word being typed
 * @param linePrefix - Current line text up to the cursor
 * @returns Last word in the line
 */
function getLastWord(linePrefix: string): string {
	const match = linePrefix.match(/[\w-]+$/);
	return match ? match[0] : '';
}

/** 
 * Filter suggestions based on validation rules and what the user has already typed 
 * @param classes - Full list of available utility classes
 * @param existingClasses - Classes already present in the attribute
 * @param linePrefix - Current line text up to the cursor
 * @returns Array of valid suggestions
 */
function getValidSuggestions(classes: string[], existingClasses: string[], linePrefix: string): string[] {
	const lastWord = getLastWord(linePrefix);

	let filteredSuggestions = classes;

	if (lastWord) {
		filteredSuggestions = filteredSuggestions.filter(cls =>
			cls.startsWith(lastWord) && !existingClasses.includes(cls));
	} else {
		// If the user hasn't started typing a new class, suggest all that aren't already used
		filteredSuggestions = filteredSuggestions.filter(cls =>
			!existingClasses.includes(cls));
	}

	filteredSuggestions = applyValidationRules(filteredSuggestions, existingClasses);

	return filteredSuggestions;
}

/**
 * Apply the validation rules to filter out invalid suggestions
 * @param suggestions - Array of class names to suggest
 * @param existingClasses  - Classes already present in the attribute
 * @returns - Array of valid suggestions
 */
function applyValidationRules(suggestions: string[], existingClasses: string[]): string[] {
	for (const group of validationRules.mutuallyExclusive) {
		const hasClassFromGroup = group.some(cls => existingClasses.includes(cls));

		// Remove all other classes from this group from suggestions
		if (hasClassFromGroup) {
			suggestions = suggestions.filter(cls => !group.includes(cls) || existingClasses.includes(cls));
		}
	}
	return suggestions;
}

/**
 * Generate documentation for a given class name
 * @param className - Name of the class to generate documentation for
 * @returns Markdown string with documentation
 */
function getDocumentationForClass(className: string): vscode.MarkdownString {
	const documentation = new vscode.MarkdownString();

	// We would replace this with actual documentation for each class
	// For now, I'm providing a generic example based on the class name

	if (className.includes('flex')) {
		documentation.appendMarkdown('**Oracle JET Flex Utility Class**\n\n');
		if (className === 'oj-flex') {
			documentation.appendMarkdown('Container that lays out children in a flexible row or column.');
		} else if (className === 'oj-flex-item') {
			documentation.appendMarkdown('Child item used within an `oj-flex` container.');
		} else if (className.includes('oj-sm-flex-items')) {
			documentation.appendMarkdown('Controls flex items sizing on small screens and above.');
		}
	} else if (className.includes('padding')) {
		documentation.appendMarkdown('**Oracle JET Padding Utility Class**\n\n');
		documentation.appendMarkdown('Applies padding to the element. The number indicates the size multiplier.');
	} else if (className.includes('margin')) {
		documentation.appendMarkdown('**Oracle JET Margin Utility Class**\n\n');
		documentation.appendMarkdown('Applies margin to the element. The number indicates the size multiplier.');
	} else if (className.includes('bg')) {
		documentation.appendMarkdown('**Oracle JET Background Utility Class**\n\n');
		documentation.appendMarkdown('Applies background color to the element.');
	}

	return documentation;
}

export function deactivate() { }