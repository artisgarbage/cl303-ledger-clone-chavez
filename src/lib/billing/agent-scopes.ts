/**
 * agent-scopes.ts
 *
 * Agent scope strings for Rail B (agent-to-agent) pricing tier.
 * Defines the permission scopes that can be granted to AgentIdentity records.
 *
 * These scopes control what actions an agent can perform via the agent endpoints
 * (/api/agent/v1/*). Implemented in Milestone 6 but defined here as part of M1
 * billing primitives.
 */

export const AGENT_SCOPES = [
  "agent:read",
  "agent:narrative",
  "agent:synthesis",
  "agent:mode:internal",
  "agent:mode:proposal",
  "agent:mode:board",
] as const;

export type AgentScope = (typeof AGENT_SCOPES)[number];

/**
 * Validates that a scope string is a known agent scope.
 */
export function isValidAgentScope(scope: string): scope is AgentScope {
  return AGENT_SCOPES.includes(scope as AgentScope);
}

/**
 * Filters an array of scope strings to only valid agent scopes.
 * Used when validating AgentIdentity registration requests.
 */
export function filterValidScopes(scopes: string[]): AgentScope[] {
  return scopes.filter(isValidAgentScope);
}
