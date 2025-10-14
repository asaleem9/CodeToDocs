import axios from 'axios';
import { ParsedGraphQLSchema, parseGraphQLSchema } from './graphqlParser';

export interface IntrospectionOptions {
  url: string;
  headers?: Record<string, string>;
}

/**
 * Introspection query to get full schema information
 */
const INTROSPECTION_QUERY = `
  query IntrospectionQuery {
    __schema {
      queryType { name }
      mutationType { name }
      subscriptionType { name }
      types {
        ...FullType
      }
      directives {
        name
        description
        locations
        args {
          ...InputValue
        }
      }
    }
  }

  fragment FullType on __Type {
    kind
    name
    description
    fields(includeDeprecated: true) {
      name
      description
      args {
        ...InputValue
      }
      type {
        ...TypeRef
      }
      isDeprecated
      deprecationReason
    }
    inputFields {
      ...InputValue
    }
    interfaces {
      ...TypeRef
    }
    enumValues(includeDeprecated: true) {
      name
      description
      isDeprecated
      deprecationReason
    }
    possibleTypes {
      ...TypeRef
    }
  }

  fragment InputValue on __InputValue {
    name
    description
    type { ...TypeRef }
    defaultValue
  }

  fragment TypeRef on __Type {
    kind
    name
    ofType {
      kind
      name
      ofType {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
                ofType {
                  kind
                  name
                }
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * Perform introspection on a GraphQL endpoint
 */
export async function introspectGraphQLEndpoint(
  options: IntrospectionOptions
): Promise<ParsedGraphQLSchema> {
  try {
    const response = await axios.post(
      options.url,
      {
        query: INTROSPECTION_QUERY,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      }
    );

    if (response.data.errors) {
      throw new Error(`GraphQL introspection errors: ${JSON.stringify(response.data.errors)}`);
    }

    // Convert introspection result to schema SDL
    const schemaSDL = convertIntrospectionToSDL(response.data.data);

    // Parse the SDL using our parser
    return parseGraphQLSchema(schemaSDL);
  } catch (error: any) {
    if (error.response) {
      throw new Error(
        `Failed to introspect GraphQL endpoint: ${error.response.status} ${error.response.statusText}`
      );
    }
    throw new Error(`Failed to introspect GraphQL endpoint: ${error.message}`);
  }
}

/**
 * Convert introspection result to GraphQL SDL (Schema Definition Language)
 */
function convertIntrospectionToSDL(introspectionData: any): string {
  const schema = introspectionData.__schema;
  let sdl = '';

  // Add schema definition if custom root types are used
  if (
    schema.queryType?.name !== 'Query' ||
    schema.mutationType?.name !== 'Mutation' ||
    schema.subscriptionType?.name !== 'Subscription'
  ) {
    sdl += 'schema {\n';
    if (schema.queryType) sdl += `  query: ${schema.queryType.name}\n`;
    if (schema.mutationType) sdl += `  mutation: ${schema.mutationType.name}\n`;
    if (schema.subscriptionType) sdl += `  subscription: ${schema.subscriptionType.name}\n`;
    sdl += '}\n\n';
  }

  // Process all types
  for (const type of schema.types) {
    // Skip internal GraphQL types
    if (type.name.startsWith('__')) continue;

    // Skip built-in scalar types
    if (['String', 'Int', 'Float', 'Boolean', 'ID'].includes(type.name)) continue;

    sdl += convertTypeToSDL(type) + '\n\n';
  }

  return sdl;
}

/**
 * Convert a single type to SDL
 */
function convertTypeToSDL(type: any): string {
  let sdl = '';

  // Add description if available
  if (type.description) {
    sdl += `"""${type.description}"""\n`;
  }

  switch (type.kind) {
    case 'OBJECT':
      sdl += `type ${type.name}`;
      if (type.interfaces && type.interfaces.length > 0) {
        sdl += ` implements ${type.interfaces.map((i: any) => i.name).join(' & ')}`;
      }
      sdl += ' {\n';
      if (type.fields) {
        for (const field of type.fields) {
          sdl += `  ${convertFieldToSDL(field)}\n`;
        }
      }
      sdl += '}';
      break;

    case 'INPUT_OBJECT':
      sdl += `input ${type.name} {\n`;
      if (type.inputFields) {
        for (const field of type.inputFields) {
          if (field.description) {
            sdl += `  """${field.description}"""\n`;
          }
          sdl += `  ${field.name}: ${convertTypeRefToString(field.type)}`;
          if (field.defaultValue !== null && field.defaultValue !== undefined) {
            sdl += ` = ${field.defaultValue}`;
          }
          sdl += '\n';
        }
      }
      sdl += '}';
      break;

    case 'ENUM':
      sdl += `enum ${type.name} {\n`;
      if (type.enumValues) {
        for (const value of type.enumValues) {
          if (value.description) {
            sdl += `  """${value.description}"""\n`;
          }
          sdl += `  ${value.name}`;
          if (value.isDeprecated) {
            sdl += ` @deprecated`;
            if (value.deprecationReason) {
              sdl += `(reason: "${value.deprecationReason}")`;
            }
          }
          sdl += '\n';
        }
      }
      sdl += '}';
      break;

    case 'SCALAR':
      sdl += `scalar ${type.name}`;
      break;

    case 'UNION':
      sdl += `union ${type.name} = ${type.possibleTypes.map((t: any) => t.name).join(' | ')}`;
      break;

    case 'INTERFACE':
      sdl += `interface ${type.name} {\n`;
      if (type.fields) {
        for (const field of type.fields) {
          sdl += `  ${convertFieldToSDL(field)}\n`;
        }
      }
      sdl += '}';
      break;

    default:
      sdl += `# Unknown type kind: ${type.kind}`;
  }

  return sdl;
}

/**
 * Convert a field to SDL
 */
function convertFieldToSDL(field: any): string {
  let sdl = '';

  if (field.description) {
    sdl += `"""${field.description}"""\n  `;
  }

  sdl += field.name;

  if (field.args && field.args.length > 0) {
    sdl += '(';
    sdl += field.args
      .map((arg: any) => {
        let argStr = `${arg.name}: ${convertTypeRefToString(arg.type)}`;
        if (arg.defaultValue !== null && arg.defaultValue !== undefined) {
          argStr += ` = ${arg.defaultValue}`;
        }
        return argStr;
      })
      .join(', ');
    sdl += ')';
  }

  sdl += `: ${convertTypeRefToString(field.type)}`;

  if (field.isDeprecated) {
    sdl += ` @deprecated`;
    if (field.deprecationReason) {
      sdl += `(reason: "${field.deprecationReason}")`;
    }
  }

  return sdl;
}

/**
 * Convert type reference to string (handles nested non-null and list types)
 */
function convertTypeRefToString(typeRef: any): string {
  if (typeRef.kind === 'NON_NULL') {
    return `${convertTypeRefToString(typeRef.ofType)}!`;
  }

  if (typeRef.kind === 'LIST') {
    return `[${convertTypeRefToString(typeRef.ofType)}]`;
  }

  return typeRef.name;
}

/**
 * Test if a GraphQL endpoint is accessible
 */
export async function testGraphQLEndpoint(url: string, headers?: Record<string, string>): Promise<boolean> {
  try {
    const response = await axios.post(
      url,
      {
        query: '{ __typename }',
      },
      {
        headers: {
          'Content-Type': 'application/json',
          ...(headers || {}),
        },
        timeout: 5000,
      }
    );

    return response.status === 200 && !response.data.errors;
  } catch {
    return false;
  }
}
