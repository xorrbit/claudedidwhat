import { IpcMain } from 'electron'
import { GRAMMAR_CHANNELS } from '@shared/types'
import { GrammarScanner } from '../services/grammar-scanner'

const grammarScanner = new GrammarScanner()

export function registerGrammarHandlers(ipcMain: IpcMain) {
  ipcMain.handle(GRAMMAR_CHANNELS.SCAN, async () => {
    return grammarScanner.scan()
  })

  ipcMain.handle(GRAMMAR_CHANNELS.GET_ONIG_WASM, async () => {
    return grammarScanner.getOnigWasm()
  })
}
