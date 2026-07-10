import { Host, HostAdapter } from '../types'
import { writeAgents as writeOpenCodeAgents, upsertProjectInstructions as upsertOpenCodeInstructions } from './opencode'
import { writeAgents as writeZooCodeAgents, upsertProjectInstructions as upsertZooCodeInstructions } from './zoocode'

const opencodeAdapter: HostAdapter = {
  writeAgents: writeOpenCodeAgents,
  upsertProjectInstructions: upsertOpenCodeInstructions,
}

const zoocodeAdapter: HostAdapter = {
  writeAgents: writeZooCodeAgents,
  upsertProjectInstructions: upsertZooCodeInstructions,
}

const adapters: Record<Host, HostAdapter> = {
  opencode: opencodeAdapter,
  zoocode: zoocodeAdapter,
}

export function getHostAdapters(host: Host | 'both'): HostAdapter[] {
  if (host === 'both') return [opencodeAdapter, zoocodeAdapter]
  return [adapters[host]]
}
