import { buildSchema, parse, GraphQLSchema, GraphQLObjectType, GraphQLField, GraphQLInputObjectType, GraphQLEnumType, GraphQLDirective } from 'graphql';

export interface GraphQLTypeInfo {
  name: string;
  kind: string;
  description?: string;
  fields?: GraphQLFieldInfo[];
  values?: string[];
  inputFields?: GraphQLFieldInfo[];
}

export interface GraphQLFieldInfo {
  name: string;
  type: string;
  description?: string;
  args?: GraphQLArgumentInfo[];
  deprecated?: boolean;
  deprecationReason?: string;
}

export interface GraphQLArgumentInfo {
  name: string;
  type: string;
  description?: string;
  defaultValue?: any;
}

export interface GraphQLOperationInfo {
  name: string;
  type: 'Query' | 'Mutation' | 'Subscription';
  description?: string;
  args: GraphQLArgumentInfo[];
  returnType: string;
  deprecated?: boolean;
}

export interface GraphQLRelationship {
  from: string;
  to: string;
  field: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

export interface GraphQLDirectiveInfo {
  name: string;
  description?: string;
  locations: string[];
  args: GraphQLArgumentInfo[];
}

export interface ParsedGraphQLSchema {
  types: GraphQLTypeInfo[];
  queries: GraphQLOperationInfo[];
  mutations: GraphQLOperationInfo[];
  subscriptions: GraphQLOperationInfo[];
  relationships: GraphQLRelationship[];
  enums: GraphQLTypeInfo[];
  inputTypes: GraphQLTypeInfo[];
  directives: GraphQLDirectiveInfo[];
}

/**
 * Parse a GraphQL schema string and extract all types, operations, and relationships
 */
export function parseGraphQLSchema(schemaString: string): ParsedGraphQLSchema {
  try {
    const schema = buildSchema(schemaString);

    const result: ParsedGraphQLSchema = {
      types: [],
      queries: [],
      mutations: [],
      subscriptions: [],
      relationships: [],
      enums: [],
      inputTypes: [],
      directives: [],
    };

    // Extract directives
    const directives = schema.getDirectives();
    for (const directive of directives) {
      // Skip built-in directives
      if (['skip', 'include', 'deprecated', 'specifiedBy'].includes(directive.name)) continue;

      result.directives.push({
        name: directive.name,
        description: directive.description || undefined,
        locations: [...directive.locations],
        args: directive.args.map(arg => ({
          name: arg.name,
          type: arg.type.toString(),
          description: arg.description || undefined,
          defaultValue: arg.defaultValue,
        })),
      });
    }

    // Extract all types from the schema
    const typeMap = schema.getTypeMap();

    for (const [typeName, type] of Object.entries(typeMap)) {
      // Skip built-in types
      if (typeName.startsWith('__')) continue;

      if (type instanceof GraphQLObjectType) {
        // Handle regular object types
        if (typeName === 'Query') {
          result.queries = extractOperations(type, 'Query');
        } else if (typeName === 'Mutation') {
          result.mutations = extractOperations(type, 'Mutation');
        } else if (typeName === 'Subscription') {
          result.subscriptions = extractOperations(type, 'Subscription');
        } else {
          const typeInfo = extractTypeInfo(type);
          result.types.push(typeInfo);

          // Extract relationships
          const relationships = extractRelationships(type);
          result.relationships.push(...relationships);
        }
      } else if (type instanceof GraphQLEnumType) {
        // Handle enums
        result.enums.push({
          name: typeName,
          kind: 'ENUM',
          description: type.description || undefined,
          values: type.getValues().map(v => v.name),
        });
      } else if (type instanceof GraphQLInputObjectType) {
        // Handle input types
        result.inputTypes.push({
          name: typeName,
          kind: 'INPUT_OBJECT',
          description: type.description || undefined,
          inputFields: extractInputFields(type),
        });
      }
    }

    return result;
  } catch (error: any) {
    throw new Error(`Failed to parse GraphQL schema: ${error.message}`);
  }
}

/**
 * Extract field information from a GraphQL object type
 */
function extractTypeInfo(type: GraphQLObjectType): GraphQLTypeInfo {
  const fields = type.getFields();

  return {
    name: type.name,
    kind: 'OBJECT',
    description: type.description || undefined,
    fields: Object.values(fields).map(field => extractFieldInfo(field)),
  };
}

/**
 * Extract field information
 */
function extractFieldInfo(field: GraphQLField<any, any>): GraphQLFieldInfo {
  return {
    name: field.name,
    type: field.type.toString(),
    description: field.description || undefined,
    args: field.args.map(arg => ({
      name: arg.name,
      type: arg.type.toString(),
      description: arg.description || undefined,
      defaultValue: arg.defaultValue,
    })),
    deprecated: field.deprecationReason !== undefined,
    deprecationReason: field.deprecationReason || undefined,
  };
}

/**
 * Extract input fields from an input object type
 */
function extractInputFields(type: GraphQLInputObjectType): GraphQLFieldInfo[] {
  const fields = type.getFields();

  return Object.values(fields).map(field => ({
    name: field.name,
    type: field.type.toString(),
    description: field.description || undefined,
    args: [],
  }));
}

/**
 * Extract operations (Query/Mutation/Subscription) from a type
 */
function extractOperations(
  type: GraphQLObjectType,
  operationType: 'Query' | 'Mutation' | 'Subscription'
): GraphQLOperationInfo[] {
  const fields = type.getFields();

  return Object.values(fields).map(field => ({
    name: field.name,
    type: operationType,
    description: field.description || undefined,
    args: field.args.map(arg => ({
      name: arg.name,
      type: arg.type.toString(),
      description: arg.description || undefined,
      defaultValue: arg.defaultValue,
    })),
    returnType: field.type.toString(),
    deprecated: field.deprecationReason !== undefined,
  }));
}

/**
 * Extract relationships between types based on field types
 */
function extractRelationships(type: GraphQLObjectType): GraphQLRelationship[] {
  const relationships: GraphQLRelationship[] = [];
  const fields = type.getFields();

  for (const field of Object.values(fields)) {
    const fieldType = field.type.toString();

    // Remove non-null and list wrappers to get the base type
    const baseType = fieldType
      .replace(/!/g, '')
      .replace(/\[/g, '')
      .replace(/\]/g, '');

    // Skip scalar types and self-references
    if (isScalarType(baseType) || baseType === type.name) continue;

    // Determine relationship type based on field type structure
    let relationType: 'one-to-one' | 'one-to-many' | 'many-to-many' = 'one-to-one';

    if (fieldType.includes('[')) {
      relationType = 'one-to-many';

      // Check if it's potentially many-to-many (field name suggests it)
      if (field.name.endsWith('s') || field.name.includes('List')) {
        relationType = 'many-to-many';
      }
    }

    relationships.push({
      from: type.name,
      to: baseType,
      field: field.name,
      type: relationType,
    });
  }

  return relationships;
}

/**
 * Check if a type is a scalar type
 */
function isScalarType(typeName: string): boolean {
  const scalarTypes = ['String', 'Int', 'Float', 'Boolean', 'ID', 'Date', 'DateTime', 'JSON'];
  return scalarTypes.includes(typeName);
}

/**
 * Generate enhanced Mermaid diagram for GraphQL schema relationships
 */
export function generateGraphQLDiagram(parsed: ParsedGraphQLSchema): string {
  let diagram = 'graph TB\n\n';

  // Add subgraph for queries
  if (parsed.queries.length > 0) {
    diagram += '  subgraph Queries\n';
    diagram += '    Q[Query Root]\n';
    for (const query of parsed.queries.slice(0, 5)) {
      const returnType = query.returnType.replace(/[!\[\]]/g, '');
      diagram += `    Q --> |${query.name}| ${returnType}\n`;
    }
    diagram += '  end\n\n';
  }

  // Add subgraph for mutations
  if (parsed.mutations.length > 0) {
    diagram += '  subgraph Mutations\n';
    diagram += '    M[Mutation Root]\n';
    for (const mutation of parsed.mutations.slice(0, 5)) {
      const returnType = mutation.returnType.replace(/[!\[\]]/g, '');
      diagram += `    M --> |${mutation.name}| ${returnType}\n`;
    }
    diagram += '  end\n\n';
  }

  // Add type nodes with field counts
  for (const type of parsed.types) {
    const fieldCount = type.fields?.length || 0;
    diagram += `  ${type.name}["${type.name}<br/><small>${fieldCount} fields</small>"]\n`;
  }

  diagram += '\n';

  // Add relationships
  for (const rel of parsed.relationships) {
    const arrow = rel.type === 'one-to-many' ? '-->|1:N|' :
                  rel.type === 'many-to-many' ? '-->|N:N|' :
                  '-->|1:1|';
    diagram += `  ${rel.from} ${arrow} ${rel.to}\n`;
  }

  // Add styling
  diagram += '\n  classDef typeClass fill:#818cf8,stroke:#6366f1,color:#fff\n';
  diagram += '  classDef queryClass fill:#10b981,stroke:#059669,color:#fff\n';
  diagram += '  classDef mutationClass fill:#f59e0b,stroke:#d97706,color:#fff\n';

  diagram += `  class ${parsed.types.map(t => t.name).join(',')} typeClass\n`;
  if (parsed.queries.length > 0) {
    diagram += '  class Q queryClass\n';
  }
  if (parsed.mutations.length > 0) {
    diagram += '  class M mutationClass\n';
  }

  return diagram;
}

/**
 * Generate example queries for GraphQL operations
 */
export function generateExampleQueries(parsed: ParsedGraphQLSchema): string {
  let examples = '';

  // Generate query examples
  if (parsed.queries.length > 0) {
    examples += '## Example Queries\n\n';
    for (const query of parsed.queries.slice(0, 3)) {
      examples += '```graphql\n';
      examples += `query {\n`;
      examples += `  ${query.name}`;

      if (query.args.length > 0) {
        examples += '(';
        examples += query.args.map(arg => `${arg.name}: ${getExampleValue(arg.type)}`).join(', ');
        examples += ')';
      }

      examples += ' {\n';
      examples += '    # Add fields here\n';
      examples += '  }\n';
      examples += '}\n';
      examples += '```\n\n';
    }
  }

  // Generate mutation examples
  if (parsed.mutations.length > 0) {
    examples += '## Example Mutations\n\n';
    for (const mutation of parsed.mutations.slice(0, 3)) {
      examples += '```graphql\n';
      examples += `mutation {\n`;
      examples += `  ${mutation.name}`;

      if (mutation.args.length > 0) {
        examples += '(';
        examples += mutation.args.map(arg => `${arg.name}: ${getExampleValue(arg.type)}`).join(', ');
        examples += ')';
      }

      examples += ' {\n';
      examples += '    # Add fields here\n';
      examples += '  }\n';
      examples += '}\n';
      examples += '```\n\n';
    }
  }

  return examples;
}

/**
 * Generate example value based on GraphQL type
 */
function getExampleValue(type: string): string {
  const baseType = type.replace(/!/g, '').replace(/\[/g, '').replace(/\]/g, '');

  switch (baseType) {
    case 'String':
      return '"example"';
    case 'Int':
      return '1';
    case 'Float':
      return '1.0';
    case 'Boolean':
      return 'true';
    case 'ID':
      return '"1"';
    default:
      return '{}';
  }
}
