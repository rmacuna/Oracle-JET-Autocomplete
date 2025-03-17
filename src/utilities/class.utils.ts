/**
 * Helper to get the last word being typed
 * @param linePrefix - Current line text up to the cursor
 * @returns Last word in the line
 */
export function getLastWord(linePrefix: string): string {
  const match = linePrefix.match(/[\w-]+$/);
  return match ? match[0] : "";
}

/**
 * Helper function to get existing classes from current attribute
 * @param linePrefix - Current line text up to the cursor
 * @param languageId - Language ID of the document
 * @returns Array of existing classes
 */
export function getExistingClasses(
  linePrefix: string,
): string[] {
  const classPatterns = [
    /class="([^"]*)$/, // HTML: class="some-class " (double quotes)
    /class='([^']*)$/, // HTML: class='some-class ' (single quotes)
    /className="([^"]*)$/, // JSX/React: className="some-class " (double quotes)
    /className='([^']*)$/, // JSX/React: className='some-class ' (single quotes)
    /className=\{`([^`]*)$/, // JSX/React: className={`some-class `} (template literals)
    /classNames\s*\([^)]*["']([^"']*)$/, // classNames library: classNames('some-class ', ...)
  ];

  // Find the first matching pattern
  for (const pattern of classPatterns) {
    const match = linePrefix.match(pattern);
    if (match && match[1]) {
      return match[1]
        .trim()
        .split(/\s+/)
        .filter((className) => className.length > 0);
    }
  }

  return [];
}

/**
 * Filter suggestions based on what the user has already typed
 * @param classLookup - A Map of available utility classes for fast lookup
 * @param existingClasses - Classes already present in the attribute
 * @param lastWord - Last word being typed by user
 * @returns Array of valid suggestions
 */
export function getValidSuggestions(
  classLookup: Map<string, boolean>,
  existingClasses: string[],
  lastWord: string
): string[] {
  const suggestions: string[] = [];

  if (lastWord) {
    // Use the Map for fast lookup
    for (const cls of classLookup.keys()) {
      if (cls.startsWith(lastWord) && !existingClasses.includes(cls)) {
        suggestions.push(cls);
      }
    }
  } else {
    // Suggest all classes that aren't already used
    for (const cls of classLookup.keys()) {
      if (!existingClasses.includes(cls)) {
        suggestions.push(cls);
      }
    }
  }

  return suggestions;
}

/**
 * Determines if the current cursor position is within a class or className attribute
 * by checking the line prefix
 */
export function isInClassAttribute(
  linePrefix: string,
): boolean {
  return (
    /className=["'][^"']*$/.test(linePrefix) || // className="..." or className='...'
    /className=\{[^}]*['"][^'"]*$/.test(linePrefix) || // className={"...
    /class=["'][^"']*$/.test(linePrefix) || // class="..." or class='...'
    /classList\.add\(['"][^'"]*$/.test(linePrefix) || // classList.add("...
    /\.className\s*=\s*['"][^'"]*$/.test(linePrefix) // .className = "...
  );
}
