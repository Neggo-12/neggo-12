/**
 * Domain event types — the vocabulary for the in-app event bus.
 *
 * Modeling domain events as a typed union keeps the app decoupled and prepares
 * a clean migration path to an external Event Bus (e.g. NestJS/microservices)
 * without changing publishers or subscribers.
 */

/** Names of the domain events the platform emits. */
export type DomainEventType =
  | 'auth.logged_in'
  | 'auth.logged_out'
  | 'auth.registered'
  | 'auth.session_restored'
  | 'tenant.resolved';

/** Payload carried by each domain event, keyed by event type. */
export interface DomainEventPayloads {
  'auth.logged_in': { userId: string; role: string; organizationId: string | null };
  'auth.logged_out': { userId: string | null };
  'auth.registered': { userId: string; role: string; b2b: boolean };
  'auth.session_restored': { userId: string };
  'tenant.resolved': { organizationId: string | null; isPlatformAdmin: boolean };
}

/** A fully-typed domain event. */
export interface DomainEvent<T extends DomainEventType = DomainEventType> {
  type: T;
  payload: DomainEventPayloads[T];
  /** ISO timestamp of when the event was emitted. */
  at: string;
}
