/**
 * Event Bus — a tiny, typed, in-memory publish/subscribe hub.
 *
 * It decouples producers from consumers so that domain events can later be
 * routed to an external transport (NestJS gateway, message queue, websockets)
 * without touching call sites. Purely synchronous and framework-free.
 */
import type {
  DomainEvent,
  DomainEventType,
  DomainEventPayloads,
} from '@/core/events/eventTypes';

type Handler<T extends DomainEventType> = (event: DomainEvent<T>) => void;

class EventBus {
  private readonly handlers = new Map<DomainEventType, Set<Handler<DomainEventType>>>();

  /**
   * Subscribes to a domain event. Returns an unsubscribe function.
   */
  on<T extends DomainEventType>(type: T, handler: Handler<T>): () => void {
    const set = this.handlers.get(type) ?? new Set<Handler<DomainEventType>>();
    set.add(handler as Handler<DomainEventType>);
    this.handlers.set(type, set);
    return () => {
      set.delete(handler as Handler<DomainEventType>);
    };
  }

  /**
   * Publishes a domain event to all current subscribers. Handler errors are
   * isolated so one bad subscriber cannot break the others.
   */
  emit<T extends DomainEventType>(type: T, payload: DomainEventPayloads[T]): void {
    const set = this.handlers.get(type);
    if (!set || set.size === 0) return;
    const event: DomainEvent<T> = { type, payload, at: new Date().toISOString() };
    for (const handler of set) {
      try {
        (handler as Handler<T>)(event);
      } catch (error) {
        console.warn(`[eventBus] handler for "${type}" threw:`, error);
      }
    }
  }

  /** Removes all subscribers (useful for tests). */
  clear(): void {
    this.handlers.clear();
  }
}

/** Shared singleton event bus. */
export const eventBus = new EventBus();
