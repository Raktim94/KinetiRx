// Package events is a minimal in-process pub-sub broadcaster that powers
// multi-device/multi-counter live sync: when one counter's mutation commits,
// every other connected browser tab is told which resource changed (never
// the row data itself) over Server-Sent Events, and re-fetches that resource
// through the normal authorized REST endpoint. This keeps the event bus
// itself free of any access-control logic — a client can only ever refresh
// data it was already allowed to read.
//
// Deliberately in-memory and per-process: KinetiRx is deployed as a single
// backend container per pharmacy (see middleware.RateLimit's doc comment for
// the same assumption), so there is no multi-instance fan-out problem to
// solve here.
package events

import "sync"

// Event names the resource that changed. Frontend listeners map this
// directly onto the same resource-loader they already use on initial load.
type Event struct {
	Resource string `json:"resource"`
}

type Bus struct {
	mu   sync.Mutex
	subs map[chan Event]struct{}
}

func NewBus() *Bus {
	return &Bus{subs: make(map[chan Event]struct{})}
}

// Subscribe registers a new listener and returns its channel plus a cancel
// function that MUST be called (typically via defer) when the listener stops
// reading, or the channel and its goroutine slot leak.
func (b *Bus) Subscribe() (<-chan Event, func()) {
	ch := make(chan Event, 16)
	b.mu.Lock()
	b.subs[ch] = struct{}{}
	b.mu.Unlock()

	cancel := func() {
		b.mu.Lock()
		if _, ok := b.subs[ch]; ok {
			delete(b.subs, ch)
			close(ch)
		}
		b.mu.Unlock()
	}
	return ch, cancel
}

// Publish notifies every current subscriber that the named resource changed.
// Non-blocking: a slow/stuck subscriber has its event dropped rather than
// stalling the mutation that triggered it — live sync is a convenience, it
// must never become a way for one client to hang another request.
func (b *Bus) Publish(resource string) {
	b.mu.Lock()
	defer b.mu.Unlock()
	for ch := range b.subs {
		select {
		case ch <- Event{Resource: resource}:
		default:
		}
	}
}
