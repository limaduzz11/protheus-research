# Protheus Research MCP Server

MCP (Model Context Protocol) server for technical research in the TOTVS Protheus ecosystem. Enables AI agents to query official documentation, community knowledge bases, and release notes through structured tools.

## Overview

Provides structured access to Protheus technical knowledge — from ADVPL language reference to module-specific documentation, runtime error investigation, and code generation.

## Tools

- **search_protheus_docs** — Search official TOTVS documentation
- **search_community** — Search trusted community sources
- **search_release_notes** — Find release notes and patches
- **compare_sources** — Cross-reference official and community findings
- **deep_research** — Comprehensive multi-source research
- **generate_advpl_example** — Generate ADVPL/TL++ code examples
- **debug_protheus_error** — Investigate runtime errors and stack traces

## Tech Stack

`TypeScript` `Node.js` `MCP SDK` `SQL Server` `REST APIs`

## Quick Start

```bash
# Install dependencies
npm install

# Build
npm run build

# Start MCP server
node dist/index.js
```

## Configuration

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "protheus-research": {
      "command": "node",
      "args": ["dist/index.js"]
    }
  }
}
```

## License

MIT
