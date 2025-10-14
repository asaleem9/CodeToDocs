import Anthropic from '@anthropic-ai/sdk';
import { calculateQualityScore, QualityScore } from './qualityScoreService';
import { parseGraphQLSchema, generateGraphQLDiagram, generateExampleQueries } from '../utils/graphqlParser';
import {
  calculateQueryComplexity,
  detectN1Problems,
  detectPagination,
  generateResponseShapes,
  generateSubscriptionExamples,
  generateErrorHandlingDocs,
  generatePerformanceHints
} from '../utils/graphqlAdvanced';

export interface DocumentationResult {
  documentation: string;
  diagram?: string;
  qualityScore?: QualityScore;
  success: boolean;
  error?: string;
}

// Create Anthropic client lazily to ensure env vars are loaded
function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  console.log('Getting Anthropic client, API key present:', !!apiKey);
  console.log('API key length:', apiKey?.length);
  console.log('API key first 10 chars:', apiKey?.substring(0, 10));

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }

  return new Anthropic({
    apiKey: apiKey,
  });
}

/**
 * Generates developer documentation for the provided code using Claude AI
 * @param code - The source code to document
 * @param language - The programming language of the code
 * @returns Promise<DocumentationResult> - The generated documentation and status
 */
export async function generateDocumentation(
  code: string,
  language: string
): Promise<DocumentationResult> {
  try {
    // Validate API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return {
        documentation: '',
        success: false,
        error: 'ANTHROPIC_API_KEY is not configured',
      };
    }

    // Validate inputs
    if (!code || code.trim().length === 0) {
      return {
        documentation: '',
        success: false,
        error: 'Code cannot be empty',
      };
    }

    // Special handling for GraphQL schemas
    if (language.toLowerCase() === 'graphql') {
      return await generateGraphQLDocumentation(code);
    }

    const documentationPrompt = `You are an expert technical documentation writer. Generate comprehensive, clear, and professional developer documentation for the following ${language} code.

The documentation should include:
1. Overview: A brief description of what the code does
2. Key Components: Main functions, classes, or modules
3. Parameters/Inputs: Description of any inputs or parameters
4. Return Values/Outputs: What the code returns or produces
5. Usage Examples: How to use the code with practical examples
6. Dependencies: Any external libraries or requirements
7. Notes: Any important considerations, edge cases, or best practices

Code to document:
\`\`\`${language}
${code}
\`\`\`

Please provide well-structured documentation in Markdown format.`;

    const diagramPrompt = `You are an expert at creating Mermaid diagrams. Analyze the following ${language} code and create a Mermaid diagram that visualizes its structure.

For object-oriented code with classes:
- Use a class diagram showing class relationships, inheritance, and composition
- Include key methods and properties

For functional code:
- Use a flowchart showing the main function flow and logic
- Show decision points and data transformations

For modules/APIs:
- Use a graph showing component relationships and dependencies

Code to analyze:
\`\`\`${language}
${code}
\`\`\`

Return ONLY the Mermaid diagram code without any explanation or markdown code blocks. Start directly with the diagram type (e.g., "classDiagram", "flowchart TD", "graph LR", etc.).`;

    const anthropic = getAnthropicClient();

    // Generate documentation and diagram in parallel
    const [docMessage, diagramMessage] = await Promise.all([
      anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [{ role: 'user', content: documentationPrompt }],
      }),
      anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        messages: [{ role: 'user', content: diagramPrompt }],
      }),
    ]);

    // Extract the text content from the responses
    const documentation = docMessage.content
      .filter((block) => block.type === 'text')
      .map((block) => ('text' in block ? block.text : ''))
      .join('\n');

    let diagram = diagramMessage.content
      .filter((block) => block.type === 'text')
      .map((block) => ('text' in block ? block.text : ''))
      .join('\n')
      .trim();

    // Clean up diagram - remove markdown code blocks if present
    diagram = diagram.replace(/^```mermaid\n/, '').replace(/\n```$/, '').trim();

    // Calculate quality score
    const qualityScore = calculateQualityScore(documentation);

    return {
      documentation,
      diagram,
      qualityScore,
      success: true,
    };
  } catch (error) {
    console.error('Error generating documentation:', error);

    return {
      documentation: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Generates specialized documentation for GraphQL schemas
 * @param schemaString - The GraphQL schema to document
 * @returns Promise<DocumentationResult> - The generated documentation with relationship diagram
 */
async function generateGraphQLDocumentation(
  schemaString: string
): Promise<DocumentationResult> {
  try {
    // Parse the GraphQL schema
    const parsed = parseGraphQLSchema(schemaString);

    // Generate relationship diagram
    const diagram = generateGraphQLDiagram(parsed);

    // Generate example queries
    const examples = generateExampleQueries(parsed);

    // Detect pagination patterns
    const paginationInfo = detectPagination(parsed);

    // Generate response shapes
    const responseShapes = generateResponseShapes(parsed);

    // Generate subscription examples
    const subscriptionExamples = generateSubscriptionExamples(parsed);

    // Generate performance hints
    const performanceHints = generatePerformanceHints(parsed);

    // Generate error handling docs
    const errorHandling = generateErrorHandlingDocs();

    // Build comprehensive documentation
    let documentation = '# GraphQL Schema Documentation\n\n';

    // Overview
    documentation += '## Overview\n\n';
    documentation += `This GraphQL schema defines ${parsed.types.length} types, `;
    documentation += `${parsed.queries.length} queries, `;
    documentation += `${parsed.mutations.length} mutations, `;
    documentation += `and ${parsed.subscriptions.length} subscriptions.\n\n`;

    if (parsed.directives.length > 0) {
      documentation += `**Custom Directives**: ${parsed.directives.length}\n\n`;
    }
    if (paginationInfo.length > 0) {
      documentation += `**Pagination Patterns**: ${paginationInfo.map(p => p.type).join(', ')}\n\n`;
    }

    // Types
    if (parsed.types.length > 0) {
      documentation += '## Types\n\n';
      for (const type of parsed.types) {
        documentation += `### ${type.name}\n\n`;
        if (type.description) {
          documentation += `${type.description}\n\n`;
        }

        if (type.fields && type.fields.length > 0) {
          documentation += '**Fields:**\n\n';
          for (const field of type.fields) {
            documentation += `- \`${field.name}\`: \`${field.type}\``;
            if (field.description) {
              documentation += ` - ${field.description}`;
            }
            if (field.deprecated) {
              documentation += ` ⚠️ **Deprecated**`;
              if (field.deprecationReason) {
                documentation += `: ${field.deprecationReason}`;
              }
            }
            documentation += '\n';

            if (field.args && field.args.length > 0) {
              documentation += '  - Arguments:\n';
              for (const arg of field.args) {
                documentation += `    - \`${arg.name}\`: \`${arg.type}\``;
                if (arg.description) {
                  documentation += ` - ${arg.description}`;
                }
                if (arg.defaultValue !== null && arg.defaultValue !== undefined) {
                  documentation += ` (default: \`${arg.defaultValue}\`)`;
                }
                documentation += '\n';
              }
            }
          }
          documentation += '\n';
        }
      }
    }

    // Queries
    if (parsed.queries.length > 0) {
      documentation += '## Queries\n\n';
      for (const query of parsed.queries) {
        documentation += `### ${query.name}\n\n`;
        if (query.description) {
          documentation += `${query.description}\n\n`;
        }
        documentation += `**Returns:** \`${query.returnType}\`\n\n`;

        // Add complexity estimate
        const complexity = calculateQueryComplexity(query, parsed.types);
        documentation += `**Complexity**: ${complexity.baseComplexity} (${complexity.description})\n\n`;
        if (complexity.warnings.length > 0) {
          documentation += '⚠️ **Warnings**:\n';
          for (const warning of complexity.warnings) {
            documentation += `- ${warning}\n`;
          }
          documentation += '\n';
        }

        if (query.args.length > 0) {
          documentation += '**Arguments:**\n\n';
          for (const arg of query.args) {
            documentation += `- \`${arg.name}\`: \`${arg.type}\``;
            if (arg.description) {
              documentation += ` - ${arg.description}`;
            }
            if (arg.defaultValue !== null && arg.defaultValue !== undefined) {
              documentation += ` (default: \`${arg.defaultValue}\`)`;
            }
            documentation += '\n';
          }
          documentation += '\n';
        }

        if (query.deprecated) {
          documentation += '⚠️ **Deprecated**\n\n';
        }
      }
    }

    // Mutations
    if (parsed.mutations.length > 0) {
      documentation += '## Mutations\n\n';
      for (const mutation of parsed.mutations) {
        documentation += `### ${mutation.name}\n\n`;
        if (mutation.description) {
          documentation += `${mutation.description}\n\n`;
        }
        documentation += `**Returns:** \`${mutation.returnType}\`\n\n`;

        if (mutation.args.length > 0) {
          documentation += '**Arguments:**\n\n';
          for (const arg of mutation.args) {
            documentation += `- \`${arg.name}\`: \`${arg.type}\``;
            if (arg.description) {
              documentation += ` - ${arg.description}`;
            }
            if (arg.defaultValue !== null && arg.defaultValue !== undefined) {
              documentation += ` (default: \`${arg.defaultValue}\`)`;
            }
            documentation += '\n';
          }
          documentation += '\n';
        }

        if (mutation.deprecated) {
          documentation += '⚠️ **Deprecated**\n\n';
        }
      }
    }

    // Subscriptions
    if (parsed.subscriptions.length > 0) {
      documentation += '## Subscriptions\n\n';
      for (const subscription of parsed.subscriptions) {
        documentation += `### ${subscription.name}\n\n`;
        if (subscription.description) {
          documentation += `${subscription.description}\n\n`;
        }
        documentation += `**Returns:** \`${subscription.returnType}\`\n\n`;

        if (subscription.args.length > 0) {
          documentation += '**Arguments:**\n\n';
          for (const arg of subscription.args) {
            documentation += `- \`${arg.name}\`: \`${arg.type}\``;
            if (arg.description) {
              documentation += ` - ${arg.description}`;
            }
            documentation += '\n';
          }
          documentation += '\n';
        }
      }
    }

    // Enums
    if (parsed.enums.length > 0) {
      documentation += '## Enums\n\n';
      for (const enumType of parsed.enums) {
        documentation += `### ${enumType.name}\n\n`;
        if (enumType.description) {
          documentation += `${enumType.description}\n\n`;
        }
        if (enumType.values) {
          documentation += '**Values:**\n\n';
          for (const value of enumType.values) {
            documentation += `- \`${value}\`\n`;
          }
          documentation += '\n';
        }
      }
    }

    // Input Types
    if (parsed.inputTypes.length > 0) {
      documentation += '## Input Types\n\n';
      for (const inputType of parsed.inputTypes) {
        documentation += `### ${inputType.name}\n\n`;
        if (inputType.description) {
          documentation += `${inputType.description}\n\n`;
        }
        if (inputType.inputFields) {
          documentation += '**Fields:**\n\n';
          for (const field of inputType.inputFields) {
            documentation += `- \`${field.name}\`: \`${field.type}\``;
            if (field.description) {
              documentation += ` - ${field.description}`;
            }
            documentation += '\n';
          }
          documentation += '\n';
        }
      }
    }

    // Relationships
    if (parsed.relationships.length > 0) {
      documentation += '## Type Relationships\n\n';
      documentation += 'The following relationships exist between types:\n\n';
      for (const rel of parsed.relationships) {
        const relType = rel.type === 'one-to-many' ? '1:N' :
                        rel.type === 'many-to-many' ? 'N:N' : '1:1';
        documentation += `- \`${rel.from}\` → \`${rel.to}\` (${relType}) via field \`${rel.field}\`\n`;
      }
      documentation += '\n';
    }

    // Directives
    if (parsed.directives.length > 0) {
      documentation += '## Custom Directives\n\n';
      for (const directive of parsed.directives) {
        documentation += `### @${directive.name}\n\n`;
        if (directive.description) {
          documentation += `${directive.description}\n\n`;
        }
        documentation += `**Locations**: ${directive.locations.join(', ')}\n\n`;
        if (directive.args.length > 0) {
          documentation += '**Arguments**:\n\n';
          for (const arg of directive.args) {
            documentation += `- \`${arg.name}\`: \`${arg.type}\``;
            if (arg.description) {
              documentation += ` - ${arg.description}`;
            }
            documentation += '\n';
          }
          documentation += '\n';
        }
      }
    }

    // Response shapes
    if (responseShapes.length > 0) {
      documentation += '## Response Shapes\n\n';
      documentation += 'Example response structures for common queries:\n\n';
      for (const shape of responseShapes) {
        documentation += `### ${shape.operationName}\n\n`;
        documentation += '**Expected Response:**\n\n';
        documentation += '```json\n';
        documentation += JSON.stringify(shape.example, null, 2);
        documentation += '\n```\n\n';
      }
    }

    // Pagination
    if (paginationInfo.length > 0) {
      documentation += '## Pagination\n\n';
      for (const pagination of paginationInfo) {
        documentation += `### ${pagination.type.charAt(0).toUpperCase() + pagination.type.slice(1)} Pagination\n\n`;
        documentation += '**Example:**\n\n';
        documentation += '```graphql\n';
        documentation += pagination.example;
        documentation += '\n```\n\n';
      }
    }

    // Examples
    documentation += examples;

    // Subscriptions
    if (subscriptionExamples) {
      documentation += subscriptionExamples;
    }

    // Performance hints
    documentation += performanceHints;

    // Error handling
    documentation += errorHandling;

    // Authentication/Authorization notes
    documentation += '## Security Considerations\n\n';
    documentation += '- Ensure proper authentication is implemented for protected queries and mutations\n';
    documentation += '- Consider rate limiting for resource-intensive operations\n';
    documentation += '- Validate all input data on the server side\n';
    documentation += '- Use DataLoader or similar patterns to prevent N+1 query problems\n';
    documentation += '- Implement query complexity limits to prevent DoS attacks\n';
    documentation += '- Use HTTPS for all GraphQL endpoints\n\n';

    // Best practices
    documentation += '## Best Practices\n\n';
    documentation += '1. **Use fragments** to reuse common field selections\n';
    documentation += '2. **Request only needed fields** to optimize performance\n';
    documentation += '3. **Handle errors gracefully** using GraphQL error extensions\n';
    documentation += '4. **Use variables** instead of string interpolation for arguments\n';
    documentation += '5. **Enable query depth limiting** to prevent malicious queries\n';
    documentation += '6. **Implement proper caching** with cache-control directives\n';
    documentation += '7. **Monitor query performance** and set up alerts for slow queries\n';

    const qualityScore = calculateQualityScore(documentation);

    return {
      documentation,
      diagram,
      qualityScore,
      success: true,
    };
  } catch (error) {
    console.error('Error generating GraphQL documentation:', error);
    return {
      documentation: '',
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse GraphQL schema',
    };
  }
}
