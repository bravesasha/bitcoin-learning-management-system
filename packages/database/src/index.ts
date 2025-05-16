import * as drizzle from 'drizzle-orm';
import * as drizzleSchema from '../drizzle/index.js';

export * from './client.js';
export * from './helpers.js';

export const schema = drizzleSchema.schema;

// Re-export all tables from schema for backward compatibility
export * from '../drizzle/schema.js';

// Re-export drizzle-orm for consumers to use
export { drizzle };
