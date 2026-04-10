// Fast word validation using a local dictionary

interface TrieNode {
  children: Map<string, TrieNode>;
  isWord: boolean;
}

export class WordValidator {
  private static instance: WordValidator | null = null;
  private wordSet: Set<string> = new Set();
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  private trieRoot: TrieNode = { children: new Map(), isWord: false };
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

    try {
      this.initPromise = this.loadDictionary();
      await this.initPromise;
      this.initialized = true;
    } catch (error) {
      this.initPromise = null;
      throw error;
    }
  }

  private async loadDictionary(): Promise<void> {
    this.wordSet = new Set();
    this.trieRoot = { children: new Map(), isWord: false };

    try {
      const response = await fetch('/words.txt');
      if (!response.ok) {
        throw new Error(`Failed to fetch words.txt: ${response.status} ${response.statusText}`);
      }
      const text = await response.text();
      const words = text.split(/\r?\n/);
      words.forEach((word) => {
        const cleaned = word.trim().toUpperCase();
        if (cleaned.length > 0) {
          this.wordSet.add(cleaned);
          this.insertWordIntoTrie(cleaned);
        }
      });
      if (this.wordSet.size === 0) {
        throw new Error('words.txt is empty');
      }
      return;
    } catch (error) {
      console.warn('Failed to load words.txt, trying dictionary.json...', error);
    }

    const jsonLoaded = await this.tryLoadJsonDictionary();
    if (!jsonLoaded) {
      throw new Error('Failed to load dictionary from words.txt or dictionary.json');
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
      const cleanedWords = arr
        .map((w) => (w || '').toString().trim().toUpperCase())
        .filter((w) => w.length > 0);
      this.wordSet = new Set(cleanedWords);
      cleanedWords.forEach((word) => this.insertWordIntoTrie(word));
      console.log(`Dictionary loaded from JSON: ${this.wordSet.size} words`);
      return true;
    } catch (e) {
      console.error('Error loading dictionary.json:', e);
      return false;
    }
  }

  private insertWordIntoTrie(word: string): void {
    let node = this.trieRoot;
    for (const char of word) {
      if (!node.children.has(char)) {
        node.children.set(char, { children: new Map(), isWord: false });
      }
      node = node.children.get(char)!;
    }
    node.isWord = true;
  }

  private searchTrie(word: string): boolean {
    let node = this.trieRoot;
    for (const char of word) {
      if (!node.children.has(char)) return false;
      node = node.children.get(char)!;
    }
    return node.isWord;
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

    // return this.wordSet.has(normalized);
    return this.searchTrie(normalized);
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
    if (!this.initialized || normalizedPrefix.length === 0) return [];

    let node = this.trieRoot;
    for (const char of normalizedPrefix) {
      const next = node.children.get(char);
      if (!next) return [];
      node = next;
    }

    const results: string[] = [];
    this.collectWordsFromNode(node, normalizedPrefix, results, limit);
    return results;
  }

  private collectWordsFromNode(
    node: TrieNode,
    currentWord: string,
    results: string[],
    limit: number
  ): void {
    if (results.length >= limit) return;

    if (node.isWord) {
      results.push(currentWord);
    }

    for (const [char, child] of node.children) {
      if (results.length >= limit) return;
      this.collectWordsFromNode(child, currentWord + char, results, limit);
    }
  }
}

// Export singleton instance
export const wordValidator = WordValidator.getInstance();
