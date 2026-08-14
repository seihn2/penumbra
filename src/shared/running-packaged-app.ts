export interface RunningProcess {
  pid: number
  command: string
}

export function parseProcessTable(output: string): RunningProcess[] {
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const match = line.match(/^(\d+)\s+(.+)$/)
      if (!match) return []
      return [{ pid: Number(match[1]), command: match[2] }]
    })
}

export function findRunningPackagedAppProcesses(
  processTable: string,
  repositoryRoot: string,
  productName = 'Penumbra'
): RunningProcess[] {
  const distPrefix = `${repositoryRoot.replace(/\/+$/, '')}/dist/`
  const executableSuffix = `/${productName}.app/Contents/MacOS/${productName}`

  return parseProcessTable(processTable).filter(({ command }) => {
    const executable = command
      .match(/^(?:"([^"]+)"|'([^']+)'|(\S+))/)
      ?.slice(1)
      .find(Boolean)
    return Boolean(
      executable?.startsWith(distPrefix) &&
        executable.endsWith(executableSuffix) &&
        /\/mac(?:-[^/]+)?\//.test(executable.slice(distPrefix.length - 1))
    )
  })
}
