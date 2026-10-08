import { Host, HostAdapter, HostOption } from '../types'
import { writeAgents as writeOpenCodeAgents, upsertProjectInstructions as upsertOpenCodeInstructions } from './opencode'
import { writeAgents as writeZooCodeAgents, upsertProjectInstructions as upsertZooCodeInstructions } from './zoocode'
import { writeAgents as writeDockerAgentFile, upsertProjectInstructions as upsertDockerAgentInstructions } from './docker-agent'

const opencodeAdapter: HostAdapter = {
  writeAgents: writeOpenCodeAgents,
  upsertProjectInstructions: upsertOpenCodeInstructions,
}

const zoocodeAdapter: HostAdapter = {
  writeAgents: writeZooCodeAgents,
  upsertProjectInstructions: upsertZooCodeInstructions,
}

const dockerAgentAdapter: HostAdapter = {
  writeAgents: (roles, cwd) => writeDockerAgentFile(roles, cwd ?? process.cwd()),
  upsertProjectInstructions: upsertDockerAgentInstructions,
}

const adapters: Record<Host, HostAdapter> = {
  opencode: opencodeAdapter,
  zoocode: zoocodeAdapter,
  'docker-agent': dockerAgentAdapter,
}

export function getHostAdapters(host: HostOption): HostAdapter[] {
  if (host === 'all') return [opencodeAdapter, zoocodeAdapter, dockerAgentAdapter]
  if (host === 'both') return [opencodeAdapter, zoocodeAdapter]
  return [adapters[host]]
}
