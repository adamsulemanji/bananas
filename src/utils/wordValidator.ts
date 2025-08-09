// Fast word validation using a local dictionary
export class WordValidator {
  private static instance: WordValidator | null = null;
  private wordSet: Set<string> = new Set();
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  // Singleton pattern to ensure dictionary is loaded only once
  static getInstance(): WordValidator {
    if (!WordValidator.instance) {
      WordValidator.instance = new WordValidator();
    }
    return WordValidator.instance;
  }

  // Initialize the dictionary (loads ~170k words)
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Prevent multiple simultaneous initializations
    if (this.initPromise) {
      await this.initPromise;
      return;
    }

    this.initPromise = this.loadDictionary();
    await this.initPromise;
    this.initialized = true;
  }

  private async loadDictionary(): Promise<void> {
    try {
      const response = await fetch('/words.txt');
      if (!response.ok) {
        throw new Error(`Failed to fetch words.txt: ${response.status} ${response.statusText}`);
      }
      const text = await response.text();
      const words = text.split(/\r?\n/);
      this.wordSet = new Set();
      words.forEach((word) => {
        const cleaned = word.trim().toUpperCase();
        if (cleaned.length > 0) {
          this.wordSet.add(cleaned);
        }
      });
    } catch (error) {
      console.warn('Failed to load words.txt, trying dictionary.json...', error);
    }
  }

  private async tryLoadJsonDictionary(): Promise<boolean> {
    try {
      const resp = await fetch('/dictionary.json');
      if (!resp.ok) {
        throw new Error(`Failed to fetch dictionary.json: ${resp.status} ${resp.statusText}`);
      }
      const arr: string[] = await resp.json();
      if (!Array.isArray(arr) || arr.length === 0) {
        throw new Error('dictionary.json is not a non-empty array');
      }
      this.wordSet = new Set(arr.map((w) => (w || '').toString().trim().toUpperCase()).filter((w) => w.length > 0));
      console.log(`Dictionary loaded from JSON: ${this.wordSet.size} words`);
      return true;
    } catch (e) {
      console.error('Error loading dictionary.json:', e);
      return false;
    }
  }

  // O(1) word validation
  isValidWord(word: string): boolean {
    if (!this.initialized) {
      console.warn('Dictionary not initialized, validation may be incorrect');
      return false;
    }

    // Normalize the word
    const normalized = word.trim().toUpperCase();

    // Minimum word length (typically 2 for word games)
    if (normalized.length < 2) {
      return false;
    }

    return this.wordSet.has(normalized);
  }

  // Batch validation for multiple words
  validateWords(words: string[]): Map<string, boolean> {
    const results = new Map<string, boolean>();

    words.forEach((word) => {
      results.set(word, this.isValidWord(word));
    });

    return results;
  }

  // Get word suggestions (for hints or autocomplete)
  getWordsStartingWith(prefix: string, limit: number = 10): string[] {
    const normalizedPrefix = prefix.toUpperCase();
    const suggestions: string[] = [];

    for (const word of this.wordSet) {
      if (word.startsWith(normalizedPrefix)) {
        suggestions.push(word);
        if (suggestions.length >= limit) break;
      }
    }

    return suggestions;
  }
}

// Export singleton instance
export const wordValidator = WordValidator.getInstance();