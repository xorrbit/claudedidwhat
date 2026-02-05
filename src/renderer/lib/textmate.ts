import * as monaco from 'monaco-editor'
import {
  createOnigScanner,
  createOnigString,
  loadWASM,
} from 'vscode-oniguruma'
import {
  Registry,
  parseRawGrammar,
  INITIAL,
  type StateStack,
  type IRawGrammar,
} from 'vscode-textmate'
import type { GrammarContribution } from '@shared/types'

class TokenizerState implements monaco.languages.IState {
  constructor(private _ruleStack: StateStack) {}

  get ruleStack(): StateStack {
    return this._ruleStack
  }

  clone(): TokenizerState {
    return new TokenizerState(this._ruleStack.clone())
  }

  equals(other: monaco.languages.IState): boolean {
    if (!(other instanceof TokenizerState)) return false
    return this._ruleStack.equals(other._ruleStack)
  }
}

class TextMateService {
  private initialized = false
  private initializing: Promise<void> | null = null
  private scopeToGrammar = new Map<string, GrammarContribution>()
  private extToLanguage = new Map<string, string>()
  private wiredLanguages = new Set<string>()

  async initialize(): Promise<void> {
    if (this.initialized) return
    if (this.initializing) return this.initializing
    this.initializing = this._initialize()
    return this.initializing
  }

  private async _initialize(): Promise<void> {
    try {
      // Get onig.wasm binary from main process
      const wasmBinary = await window.electronAPI.grammar.getOnigWasm()
      if (!wasmBinary) {
        console.warn('TextMate: onig.wasm not available, using Monarch tokenizers')
        return
      }

      // IPC may serialize Uint8Array as a plain object — ensure we have a proper ArrayBuffer
      const wasmData = wasmBinary instanceof Uint8Array
        ? wasmBinary.buffer
        : new Uint8Array(Object.values(wasmBinary as unknown as Record<string, number>)).buffer

      await loadWASM(wasmData as ArrayBuffer)

      // Scan for grammar contributions
      const scanResult = await window.electronAPI.grammar.scan()
      if (scanResult.errors.length > 0) {
        console.warn('TextMate scan errors:', scanResult.errors)
      }
      if (scanResult.grammars.length === 0) {
        this.initialized = true
        return
      }

      // Build lookup maps
      for (const grammar of scanResult.grammars) {
        this.scopeToGrammar.set(grammar.scopeName, grammar)
        for (const ext of grammar.fileExtensions) {
          // Store without leading dot for easy lookup
          const normalized = ext.startsWith('.') ? ext.slice(1) : ext
          if (!this.extToLanguage.has(normalized)) {
            this.extToLanguage.set(normalized, grammar.languageId)
          }
        }
      }

      // Create vscode-textmate registry
      const registry = new Registry({
        onigLib: Promise.resolve({ createOnigScanner, createOnigString }),
        loadGrammar: async (scopeName: string): Promise<IRawGrammar | null> => {
          const grammar = this.scopeToGrammar.get(scopeName)
          if (!grammar) return null
          return parseRawGrammar(grammar.rawContent, grammar.grammarPath)
        },
      })

      // Wire grammars into Monaco
      await this.wireGrammarsToMonaco(registry, scanResult.grammars)

      this.initialized = true
    } catch (err) {
      console.warn('TextMate initialization failed:', err)
    }
  }

  private async wireGrammarsToMonaco(
    registry: Registry,
    grammars: GrammarContribution[],
  ): Promise<void> {
    // Group by languageId — first scope per language wins
    const languageToScope = new Map<string, string>()
    for (const grammar of grammars) {
      if (!languageToScope.has(grammar.languageId)) {
        languageToScope.set(grammar.languageId, grammar.scopeName)
      }
    }

    // Get already-registered Monaco languages
    const knownLanguages = new Set(
      monaco.languages.getLanguages().map((l) => l.id),
    )

    for (const [languageId, scopeName] of languageToScope) {
      try {
        // Register language if not already known
        if (!knownLanguages.has(languageId)) {
          monaco.languages.register({ id: languageId })
        }

        const grammar = await registry.loadGrammar(scopeName)
        if (!grammar) continue

        monaco.languages.setTokensProvider(languageId, {
          getInitialState(): monaco.languages.IState {
            return new TokenizerState(INITIAL)
          },
          tokenize(line: string, state: monaco.languages.IState): monaco.languages.ILineTokens {
            const tokenizeResult = grammar.tokenizeLine(line, (state as TokenizerState).ruleStack)
            return {
              tokens: tokenizeResult.tokens.map((token) => ({
                startIndex: token.startIndex,
                scopes: token.scopes[token.scopes.length - 1],
              })),
              endState: new TokenizerState(tokenizeResult.ruleStack),
            }
          },
        })

        this.wiredLanguages.add(languageId)
      } catch (err) {
        console.warn(`TextMate: failed to wire grammar for ${languageId}:`, err)
      }
    }
  }

  getLanguageForFile(filePath: string): string | null {
    const ext = filePath.split('.').pop()?.toLowerCase()
    if (!ext) return null
    return this.extToLanguage.get(ext) ?? null
  }

  hasGrammar(languageId: string): boolean {
    return this.wiredLanguages.has(languageId)
  }
}

export const textMateService = new TextMateService()
