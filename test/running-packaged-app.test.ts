import { describe, expect, it } from 'vitest'
import {
  findRunningPackagedAppProcesses,
  parseProcessTable
} from '../src/shared/running-packaged-app'

describe('running packaged app guard', () => {
  it('parses ps output without accepting malformed rows', () => {
    expect(parseProcessTable('  42 /usr/bin/node app.js\ninvalid\n')).toEqual([
      { pid: 42, command: '/usr/bin/node app.js' }
    ])
  })

  it('finds only Penumbra executables running from this repository dist folder', () => {
    const root = '/Users/demo/interview-coder-cn'
    const processTable = [
      `75779 ${root}/dist/mac-arm64/Penumbra.app/Contents/MacOS/Penumbra`,
      `75780 ${root}/dist/mac/Penumbra.app/Contents/MacOS/Penumbra --flag`,
      '75781 /Applications/Penumbra.app/Contents/MacOS/Penumbra',
      `75782 /bin/zsh -lc ${root}/dist/mac-arm64/Penumbra.app/Contents/MacOS/Penumbra`
    ].join('\n')

    expect(findRunningPackagedAppProcesses(processTable, root).map(({ pid }) => pid)).toEqual([
      75779, 75780
    ])
  })
})
