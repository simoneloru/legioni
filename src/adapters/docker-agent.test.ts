import { describe, expect, it } from 'vitest'
import {
  buildDockerAgentConfig,
  mapToolsToDockerToolsets,
  subAgentsFor,
  toolsetsFor,
} from './docker-agent'
import { CompiledRole } from '../types'

function role(id: string, allow: string[] = ['read']): CompiledRole {
  return {
    id,
    frontmatter: {
      id,
      name: id,
      model: 'openai/gpt-5-mini',
      mode: id === 'orchestrator' ? 'primary' : 'subagent',
      tools: { allow, deny: [] },
    },
    prompt: `${id} prompt`,
  }
}

describe('docker-agent adapter', () => {
  it('maps opencode tools to docker toolsets', () => {
    const toolsets = mapToolsToDockerToolsets(['read', 'bash', 'todowrite'])
    expect(toolsets).toContainEqual({ type: 'filesystem' })
    expect(toolsets).toContainEqual({ type: 'shell' })
    expect(toolsets).toContainEqual({ type: 'todo', shared: true })
  })

  it('gives the orchestrator all other agents plus background dispatch', () => {
    const ids = ['orchestrator', 'architect', 'implementer']
    expect(subAgentsFor('orchestrator', ids)).toEqual(['architect', 'implementer'])
    expect(subAgentsFor('implementer', ids)).toEqual([])

    const toolsets = toolsetsFor('orchestrator', ['read'])
    expect(toolsets).toContainEqual({ type: 'background_agents' })
  })

  it('builds a runnable multi-agent config', () => {
    const config = buildDockerAgentConfig([role('orchestrator', ['read', 'task']), role('implementer', ['read', 'edit', 'bash'])])
    expect(Object.keys(config.agents)).toEqual(['orchestrator', 'implementer'])
    expect(config.agents.orchestrator.sub_agents).toEqual(['implementer'])
    expect(config.agents.orchestrator.instruction).toContain('run_background_agent')
    expect(config.agents.implementer.sub_agents).toBeUndefined()
  })
})
