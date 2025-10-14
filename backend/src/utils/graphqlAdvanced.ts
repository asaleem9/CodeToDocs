import { GraphQLSchema, GraphQLField, GraphQLObjectType, GraphQLInterfaceType, GraphQLList, GraphQLNonNull } from 'graphql';
import { ParsedGraphQLSchema, GraphQLOperationInfo, GraphQLTypeInfo } from './graphqlParser';

/**
 * Query complexity analysis
 */
export interface ComplexityEstimate {
  baseComplexity: number;
  withNestedFields: number;
  description: string;
  warnings: string[];
}

/**
 * Directive information
 */
export interface DirectiveInfo {
  name: string;
  description?: string;
  locations: string[];
  args: Array<{
    name: string;
    type: string;
    description?: string;
    defaultValue?: any;
  }>;
}

/**
 * Response shape information
 */
export interface ResponseShape {
  operationName: string;
  shape: string;
  example: any;
}

/**
 * N+1 query warning
 */
export interface N1Warning {
  type: string;
  field: string;
  reason: string;
  solution: string;
}

/**
 * Pagination info
 */
export interface PaginationInfo {
  type: 'offset' | 'cursor' | 'relay' | 'apollo';
  fields: string[];
  example: string;
}

/**
 * Calculate query complexity based on field depth and list types
 */
export function calculateQueryComplexity(
  operation: GraphQLOperationInfo,
  types: GraphQLTypeInfo[]
): ComplexityEstimate {
  let baseComplexity = 1;
  let warnings: string[] = [];

  // Base complexity from arguments
  baseComplexity += operation.args.length * 0.5;

  // Check return type complexity
  const returnTypeName = operation.returnType.replace(/[!\[\]]/g, '');
  const returnType = types.find(t => t.name === returnTypeName);

  // List types are more expensive
  if (operation.returnType.includes('[')) {
    baseComplexity += 10;
    warnings.push('Returns a list - consider implementing pagination');
  }

  // Deep object types increase complexity
  if (returnType?.fields) {
    const fieldCount = returnType.fields.length;
    baseComplexity += fieldCount * 0.3;

    // Check for nested lists
    const nestedLists = returnType.fields.filter(f => f.type.includes('['));
    if (nestedLists.length > 0) {
      baseComplexity += nestedLists.length * 5;
      warnings.push(`Has ${nestedLists.length} nested list field(s) - potential N+1 query issue`);
    }
  }

  // Estimate with nested fields (worst case)
  const withNestedFields = baseComplexity * 2.5;

  return {
    baseComplexity: Math.round(baseComplexity),
    withNestedFields: Math.round(withNestedFields),
    description: getComplexityDescription(baseComplexity),
    warnings,
  };
}

/**
 * Get human-readable complexity description
 */
function getComplexityDescription(complexity: number): string {
  if (complexity <= 5) return 'Low complexity - fast query';
  if (complexity <= 15) return 'Medium complexity - acceptable performance';
  if (complexity <= 30) return 'High complexity - may need optimization';
  return 'Very high complexity - consider query limits';
}

/**
 * Detect potential N+1 query problems
 */
export function detectN1Problems(parsed: ParsedGraphQLSchema): N1Warning[] {
  const warnings: N1Warning[] = [];

  for (const type of parsed.types) {
    if (!type.fields) continue;

    for (const field of type.fields) {
      // Check for list fields that reference other types
      if (field.type.includes('[') && !isScalarType(field.type)) {
        const referencedType = field.type.replace(/[!\[\]]/g, '');

        warnings.push({
          type: type.name,
          field: field.name,
          reason: `Field "${field.name}" returns a list of "${referencedType}" - may cause N+1 queries`,
          solution: 'Implement DataLoader or batch loading in resolver',
        });
      }
    }
  }

  return warnings;
}

/**
 * Detect pagination patterns
 */
export function detectPagination(parsed: ParsedGraphQLSchema): PaginationInfo[] {
  const paginationInfos: PaginationInfo[] = [];

  // Check for Relay-style pagination
  const connectionTypes = parsed.types.filter(t =>
    t.name.endsWith('Connection') &&
    t.fields?.some(f => f.name === 'edges' || f.name === 'pageInfo')
  );

  for (const connType of connectionTypes) {
    paginationInfos.push({
      type: 'relay',
      fields: ['edges', 'pageInfo', 'nodes'],
      example: generateRelayPaginationExample(connType.name),
    });
  }

  // Check for offset pagination
  for (const query of parsed.queries) {
    const hasOffset = query.args.some(a => a.name === 'offset' || a.name === 'skip');
    const hasLimit = query.args.some(a => a.name === 'limit' || a.name === 'take' || a.name === 'first');

    if (hasOffset && hasLimit) {
      paginationInfos.push({
        type: 'offset',
        fields: query.args.filter(a =>
          a.name === 'offset' || a.name === 'skip' || a.name === 'limit' || a.name === 'take'
        ).map(a => a.name),
        example: generateOffsetPaginationExample(query.name, query.args),
      });
    } else if (query.args.some(a => a.name === 'after' || a.name === 'before')) {
      paginationInfos.push({
        type: 'cursor',
        fields: query.args.filter(a =>
          a.name === 'after' || a.name === 'before' || a.name === 'first' || a.name === 'last'
        ).map(a => a.name),
        example: generateCursorPaginationExample(query.name, query.args),
      });
    }
  }

  return paginationInfos;
}

/**
 * Generate example response shapes
 */
export function generateResponseShapes(parsed: ParsedGraphQLSchema): ResponseShape[] {
  const shapes: ResponseShape[] = [];

  // Generate for queries
  for (const query of parsed.queries.slice(0, 3)) {
    const shape = generateShapeForOperation(query, parsed.types);
    shapes.push({
      operationName: query.name,
      shape: shape.shape,
      example: shape.example,
    });
  }

  return shapes;
}

/**
 * Generate shape for an operation
 */
function generateShapeForOperation(
  operation: GraphQLOperationInfo,
  types: GraphQLTypeInfo[]
): { shape: string; example: any } {
  const returnTypeName = operation.returnType.replace(/[!\[\]]/g, '');
  const isList = operation.returnType.includes('[');
  const type = types.find(t => t.name === returnTypeName);

  if (!type || !type.fields) {
    // Scalar type
    const example = getExampleValueForType(returnTypeName);
    return {
      shape: operation.returnType,
      example: isList ? [example] : example,
    };
  }

  // Build shape with first few fields
  const fields = type.fields.slice(0, 5);
  const shapeObj: any = {};
  const exampleObj: any = {};

  for (const field of fields) {
    const fieldTypeName = field.type.replace(/[!\[\]]/g, '');
    const isFieldList = field.type.includes('[');
    const fieldExample = getExampleValueForType(fieldTypeName);

    shapeObj[field.name] = field.type;
    exampleObj[field.name] = isFieldList ? [fieldExample] : fieldExample;
  }

  if (type.fields.length > 5) {
    shapeObj['...'] = `${type.fields.length - 5} more fields`;
  }

  return {
    shape: JSON.stringify(shapeObj, null, 2),
    example: isList ? [exampleObj] : exampleObj,
  };
}

/**
 * Generate subscription examples with WebSocket setup
 */
export function generateSubscriptionExamples(parsed: ParsedGraphQLSchema): string {
  if (parsed.subscriptions.length === 0) {
    return '';
  }

  let examples = '## Subscription Examples\n\n';
  examples += '### WebSocket Connection Setup\n\n';
  examples += '```javascript\n';
  examples += `import { createClient } from 'graphql-ws';\n\n`;
  examples += `const client = createClient({\n`;
  examples += `  url: 'ws://your-api.com/graphql',\n`;
  examples += `  connectionParams: {\n`;
  examples += `    authToken: 'your-auth-token',\n`;
  examples += `  },\n`;
  examples += `});\n`;
  examples += '```\n\n';

  for (const sub of parsed.subscriptions) {
    examples += `### ${sub.name}\n\n`;
    if (sub.description) {
      examples += `${sub.description}\n\n`;
    }

    examples += '**GraphQL Subscription:**\n\n';
    examples += '```graphql\n';
    examples += `subscription {\n`;
    examples += `  ${sub.name}`;

    if (sub.args.length > 0) {
      examples += '(';
      examples += sub.args.map(arg =>
        `${arg.name}: ${getExampleValueForType(arg.type.replace(/[!\[\]]/g, ''))}`
      ).join(', ');
      examples += ')';
    }

    examples += ' {\n';
    examples += '    # Add fields from ' + sub.returnType + '\n';
    examples += '  }\n';
    examples += '}\n';
    examples += '```\n\n';

    examples += '**JavaScript Client:**\n\n';
    examples += '```javascript\n';
    examples += `const subscription = client.iterate({\n`;
    examples += `  query: \`subscription {\n`;
    examples += `    ${sub.name}`;

    if (sub.args.length > 0) {
      examples += '(';
      examples += sub.args.map(arg =>
        `${arg.name}: ${getExampleValueForType(arg.type.replace(/[!\[\]]/g, ''))}`
      ).join(', ');
      examples += ')';
    }

    examples += ' { id }\n';
    examples += `  }\`,\n`;
    examples += `});\n\n`;
    examples += `for await (const event of subscription) {\n`;
    examples += `  console.log('Update:', event.data);\n`;
    examples += `}\n`;
    examples += '```\n\n';
  }

  return examples;
}

/**
 * Generate error handling documentation
 */
export function generateErrorHandlingDocs(): string {
  let docs = '## Error Handling\n\n';

  docs += '### Common Error Codes\n\n';
  docs += '| Code | Description | Example |\n';
  docs += '|------|-------------|----------|\n';
  docs += '| `UNAUTHENTICATED` | User not authenticated | Missing or invalid auth token |\n';
  docs += '| `FORBIDDEN` | User lacks permissions | Accessing admin-only resource |\n';
  docs += '| `NOT_FOUND` | Resource not found | Invalid ID provided |\n';
  docs += '| `BAD_USER_INPUT` | Invalid input data | Validation failed |\n';
  docs += '| `INTERNAL_SERVER_ERROR` | Server error | Database connection failed |\n';
  docs += '| `GRAPHQL_VALIDATION_FAILED` | Query syntax error | Invalid query structure |\n\n';

  docs += '### Error Response Format\n\n';
  docs += '```json\n';
  docs += '{\n';
  docs += '  "errors": [\n';
  docs += '    {\n';
  docs += '      "message": "Not authorized",\n';
  docs += '      "locations": [{ "line": 2, "column": 3 }],\n';
  docs += '      "path": ["user", "email"],\n';
  docs += '      "extensions": {\n';
  docs += '        "code": "FORBIDDEN",\n';
  docs += '        "timestamp": "2025-10-08T12:00:00Z",\n';
  docs += '        "field": "email"\n';
  docs += '      }\n';
  docs += '    }\n';
  docs += '  ],\n';
  docs += '  "data": null\n';
  docs += '}\n';
  docs += '```\n\n';

  docs += '### Client-Side Error Handling\n\n';
  docs += '```javascript\n';
  docs += 'try {\n';
  docs += '  const result = await client.query({ query: MY_QUERY });\n';
  docs += '  // Handle data\n';
  docs += '} catch (error) {\n';
  docs += '  if (error.graphQLErrors) {\n';
  docs += '    error.graphQLErrors.forEach(({ message, extensions }) => {\n';
  docs += '      switch (extensions.code) {\n';
  docs += '        case "UNAUTHENTICATED":\n';
  docs += '          // Redirect to login\n';
  docs += '          break;\n';
  docs += '        case "FORBIDDEN":\n';
  docs += '          // Show permission error\n';
  docs += '          break;\n';
  docs += '        default:\n';
  docs += '          // Show generic error\n';
  docs += '      }\n';
  docs += '    });\n';
  docs += '  }\n';
  docs += '}\n';
  docs += '```\n\n';

  return docs;
}

/**
 * Helper: Check if type is scalar
 */
function isScalarType(typeName: string): boolean {
  const cleanType = typeName.replace(/[!\[\]]/g, '');
  const scalarTypes = ['String', 'Int', 'Float', 'Boolean', 'ID', 'Date', 'DateTime', 'JSON'];
  return scalarTypes.includes(cleanType);
}

/**
 * Helper: Get example value for type
 */
function getExampleValueForType(type: string): any {
  const cleanType = type.replace(/[!\[\]]/g, '');

  switch (cleanType) {
    case 'String': return '"example"';
    case 'Int': return 1;
    case 'Float': return 1.5;
    case 'Boolean': return true;
    case 'ID': return '"1"';
    case 'Date': return '"2025-10-08"';
    case 'DateTime': return '"2025-10-08T12:00:00Z"';
    case 'JSON': return '{}';
    default: return `{ /* ${cleanType} fields */ }`;
  }
}

/**
 * Generate Relay pagination example
 */
function generateRelayPaginationExample(connectionType: string): string {
  const baseName = connectionType.replace('Connection', '');
  return `query {
  ${baseName.toLowerCase()}s(first: 10, after: "cursor") {
    edges {
      node {
        id
        # fields...
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}`;
}

/**
 * Generate offset pagination example
 */
function generateOffsetPaginationExample(
  queryName: string,
  args: Array<{ name: string; type: string }>
): string {
  const limitArg = args.find(a => a.name === 'limit' || a.name === 'take')?.name || 'limit';
  const offsetArg = args.find(a => a.name === 'offset' || a.name === 'skip')?.name || 'offset';

  return `query {
  ${queryName}(${limitArg}: 10, ${offsetArg}: 0) {
    id
    # fields...
  }
}`;
}

/**
 * Generate cursor pagination example
 */
function generateCursorPaginationExample(
  queryName: string,
  args: Array<{ name: string; type: string }>
): string {
  return `query {
  ${queryName}(first: 10, after: "cursor") {
    id
    # fields...
  }
}`;
}

/**
 * Generate performance hints
 */
export function generatePerformanceHints(parsed: ParsedGraphQLSchema): string {
  let hints = '## Performance Optimization\n\n';

  const n1Warnings = detectN1Problems(parsed);

  if (n1Warnings.length > 0) {
    hints += '### N+1 Query Prevention\n\n';
    hints += '⚠️ **Potential N+1 query issues detected:**\n\n';

    for (const warning of n1Warnings.slice(0, 5)) {
      hints += `- **${warning.type}.${warning.field}**: ${warning.reason}\n`;
      hints += `  - *Solution*: ${warning.solution}\n\n`;
    }
  }

  hints += '### DataLoader Pattern\n\n';
  hints += '```javascript\n';
  hints += `import DataLoader from 'dataloader';\n\n`;
  hints += `const userLoader = new DataLoader(async (ids) => {\n`;
  hints += `  const users = await db.users.findMany({ where: { id: { in: ids } } });\n`;
  hints += `  return ids.map(id => users.find(u => u.id === id));\n`;
  hints += `});\n\n`;
  hints += `// In resolver\n`;
  hints += `resolve: (parent) => userLoader.load(parent.userId)\n`;
  hints += '```\n\n';

  hints += '### Query Depth Limiting\n\n';
  hints += '```javascript\n';
  hints += `import { depthLimit } from 'graphql-depth-limit';\n\n`;
  hints += `const server = new ApolloServer({\n`;
  hints += `  validationRules: [depthLimit(5)]\n`;
  hints += `});\n`;
  hints += '```\n\n';

  hints += '### Field-Level Caching\n\n';
  hints += '```javascript\n';
  hints += `// Apollo Server cache control\n`;
  hints += `type Product {\n`;
  hints += `  id: ID!\n`;
  hints += `  name: String! @cacheControl(maxAge: 3600)\n`;
  hints += `  price: Float! @cacheControl(maxAge: 300)\n`;
  hints += `}\n`;
  hints += '```\n\n';

  return hints;
}
