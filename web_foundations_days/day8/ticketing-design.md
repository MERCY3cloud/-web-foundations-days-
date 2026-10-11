# TicketHub: Event Ticketing System Design

## 1. Requirements

TicketHub sells tickets for concerts and events. It has 2 million registered users and must support normal browsing and sudden demand when popular concerts go on sale.

### Functional requirements

1. Users can register, sign in, and manage their accounts.
2. Users can browse events and view dates, venues, and prices.
3. Users can view a seat map and current seat availability.
4. Users can temporarily hold available seats while checking out.
5. Users can pay for an order and receive confirmation after successful payment.
6. Users can view their orders and purchased tickets.
7. The system releases expired seat holds.
8. Administrators can create events and manage seating and inventory.

### Non-functional requirements

- **Speed:** Event pages and seat maps should load quickly under normal and peak traffic.
- **Correctness:** A seat must never be sold to two customers.
- **Fairness:** A virtual waiting room, queue tokens, rate limits, and purchase limits help provide orderly access and discourage bots.
- **Availability:** The service should recover gracefully from component failures.
- **Security:** Use HTTPS, authentication, authorization, validation, and a trusted payment provider. Never store raw payment-card details.
- **Scalability:** Application servers and background workers should scale horizontally.
- **Observability:** Monitor latency, errors, queue lengths, payment failures, and database contention.

Correctness is more important than accepting every purchase instantly. If the system cannot safely confirm a seat, it should reject or delay the request instead of risking duplicate sales.

## 2. Traffic and Capacity Estimates

### Given facts and assumptions

- Registered users: 2,000,000.
- Normal daily visitors: 50,000.
- Each visitor views 10 pages per day.
- Normal ticket sales: 5,000 per day.
- During a popular sale, 200,000 people attempt to buy 20,000 seats in 10 minutes.
- One day has 86,400 seconds.
- Normal averages are calculated over 24 hours. Real traffic varies by time of day.
- The sale estimate assumes one initial purchase attempt per person. Retries and additional API requests can increase actual traffic.

### Normal traffic

Daily page requests:

50,000 visitors x 10 pages = 500,000 page requests per day.

Average page request rate:

500,000 / 86,400 = approximately 5.8 page requests per second.

Average normal ticket sales:

5,000 / 86,400 = approximately 0.058 tickets per second.

These estimates exclude extra API calls for authentication, event details, seat maps, and payments.

### Popular-sale traffic

Ten minutes equals 600 seconds.

Initial purchase-attempt rate:

200,000 / 600 = approximately 333 purchase attempts per second.

Demand-to-supply ratio:

200,000 potential buyers / 20,000 seats = 10 buyers per seat.

Only 10% of potential buyers can obtain a seat if all 20,000 seats are available and sold.

### Comparison

| Metric | Normal day | Popular sale |
|---|---:|---:|
| Visitors or attempted buyers | 50,000/day | 200,000/10 minutes |
| Page requests or initial purchase attempts | 500,000/day | 200,000/10 minutes |
| Average calculated rate | 5.8 page requests/second | 333 purchase attempts/second |
| Main challenge | Everyday browsing | Traffic spikes and seat contention |

The specified sale rate is about 57 times the normal average page-request rate. This compares different request types, so it is a useful capacity comparison rather than an exact like-for-like measurement.

TicketHub should use a waiting room, rate limits, caching, and scalable application servers. The database must remain the final authority for seat availability.

## 3. REST API Design

The API uses JSON and REST conventions. Purchasing endpoints require authentication.

### Endpoint 1: Browse events

- Method: GET
- Path: `/api/events`
- Purpose: Return paginated upcoming events.
- Success: `200 OK`

Example response:

```json
{
  "events": [
    {
      "id": 101,
      "name": "Summer Music Festival",
      "venue": "City Arena",
      "status": "ON_SALE"
    }
  ],
  "page": 1
}
```

### Endpoint 2: View event seats

- Method: GET
- Path: `/api/events/{eventId}/seats`
- Purpose: Return seat labels, prices, and current availability.
- Success: `200 OK`

Example response:

```json
{
  "eventId": 101,
  "seats": [
    {"id": 501, "label": "A1", "price": 5000, "status": "AVAILABLE"},
    {"id": 502, "label": "A2", "price": 5000, "status": "HELD"}
  ]
}
```

The seat map can become outdated immediately. The hold endpoint must verify availability in the database.

### Endpoint 3: Hold seats

- Method: POST
- Path: `/api/orders/holds`
- Purpose: Temporarily hold available seats for the authenticated customer.
- Success: `201 Created`

Example request:

```json
{
  "eventId": 101,
  "seatIds": [501],
  "idempotencyKey": "hold-request-abc"
}
```

Example response:

```json
{
  "orderId": 9001,
  "status": "PENDING_PAYMENT",
  "expiresAt": "2027-06-15T12:05:00Z"
}
```

If a seat is held or sold, return `409 Conflict`. A multi-seat request must hold all requested seats or none of them.

### Endpoint 4: Pay for an order

- Method: POST
- Path: `/api/orders/{orderId}/payments`
- Purpose: Initiate payment through a trusted payment provider.
- Success: `202 Accepted` while processing, or `200 OK` for an immediate result.

Example request:

```json
{
  "paymentMethodToken": "provider-token-example",
  "idempotencyKey": "payment-order-9001"
}
```

Example response:

```json
{
  "orderId": 9001,
  "paymentStatus": "PROCESSING"
}
```

The system verifies the provider callback before confirming the order. Duplicate callbacks must not create duplicate purchases.

### Endpoint 5: View an order

- Method: GET
- Path: `/api/orders/{orderId}`
- Purpose: Return the authenticated customer's order and payment status.
- Success: `200 OK`

Example response:

```json
{
  "orderId": 9001,
  "status": "CONFIRMED",
  "totalAmount": 5000,
  "currency": "KES"
}
```

### Endpoint 6: View my tickets

- Method: GET
- Path: `/api/me/tickets`
- Purpose: List tickets owned by the authenticated customer.
- Success: `200 OK`

Example response:

```json
{
  "tickets": [
    {
      "ticketId": 7001,
      "eventId": 101,
      "seatId": 501,
      "status": "VALID"
    }
  ]
}
```

### Common API errors

- `400 Bad Request`: Invalid request fields.
- `401 Unauthorized`: Authentication is required.
- `403 Forbidden`: The customer cannot access the resource.
- `404 Not Found`: Event, seat, or order does not exist.
- `409 Conflict`: Seat is unavailable or the order state has changed.
- `429 Too Many Requests`: The rate limit was exceeded.
- `500 Internal Server Error`: Unexpected server error.

## 4. Relational Database Schema

TicketHub uses PostgreSQL because relational transactions, foreign keys, unique constraints, and row locks help protect ticket inventory.

### Table 1: users

| Column | Type | Purpose |
|---|---|---|
| id | BIGINT PRIMARY KEY | Unique user ID |
| name | VARCHAR(100) NOT NULL | Customer name |
| email | VARCHAR(255) UNIQUE NOT NULL | Login email |
| password_hash | VARCHAR(255) NOT NULL | Secure password hash |
| created_at | TIMESTAMP NOT NULL | Account creation time |

### Table 2: events

| Column | Type | Purpose |
|---|---|---|
| id | BIGINT PRIMARY KEY | Unique event ID |
| name | VARCHAR(200) NOT NULL | Event name |
| venue | VARCHAR(200) NOT NULL | Venue |
| starts_at | TIMESTAMP NOT NULL | Start time |
| status | VARCHAR(30) NOT NULL | Event sale status |
| created_at | TIMESTAMP NOT NULL | Creation time |

### Table 3: seats

Each row represents one seat for one event.

| Column | Type | Purpose |
|---|---|---|
| id | BIGINT PRIMARY KEY | Unique event-seat ID |
| event_id | BIGINT REFERENCES events(id) | Related event |
| seat_label | VARCHAR(20) NOT NULL | Label such as A1 |
| price | NUMERIC(10,2) NOT NULL | Ticket price |
| status | VARCHAR(20) NOT NULL | AVAILABLE, HELD, or SOLD |
| held_by_order_id | BIGINT NULL | Order holding the seat |
| hold_expires_at | TIMESTAMP NULL | Hold expiration time |

A unique constraint on `(event_id, seat_label)` prevents duplicate seat labels within the same event.

### Table 4: orders

| Column | Type | Purpose |
|---|---|---|
| id | BIGINT PRIMARY KEY | Unique order ID |
| user_id | BIGINT REFERENCES users(id) | Customer |
| status | VARCHAR(30) NOT NULL | PENDING_PAYMENT, CONFIRMED, EXPIRED, or CANCELLED |
| total_amount | NUMERIC(12,2) NOT NULL | Order total |
| created_at | TIMESTAMP NOT NULL | Creation time |
| expires_at | TIMESTAMP NULL | Payment deadline |

### Supporting table: order_items

| Column | Type | Purpose |
|---|---|---|
| id | BIGINT PRIMARY KEY | Unique item ID |
| order_id | BIGINT REFERENCES orders(id) | Parent order |
| seat_id | BIGINT REFERENCES seats(id) | Related seat |
| price_at_purchase | NUMERIC(10,2) NOT NULL | Agreed price |

The production design must enforce that a seat cannot belong to two active reservations or completed sales. One approach is a separate active-reservation table with a unique constraint on `seat_id`, while retaining historical order items after cancellation.

### Supporting table: payments

| Column | Type | Purpose |
|---|---|---|
| id | BIGINT PRIMARY KEY | Payment attempt ID |
| order_id | BIGINT REFERENCES orders(id) | Related order |
| provider_reference | VARCHAR(255) UNIQUE | Provider transaction reference |
| amount | NUMERIC(12,2) NOT NULL | Amount charged |
| status | VARCHAR(30) NOT NULL | PENDING, SUCCEEDED, or FAILED |
| created_at | TIMESTAMP NOT NULL | Creation time |

### Relationships

- One user can create many orders.
- One event has many seats.
- One order contains one or more order items.
- Each order item refers to one seat.
- One order may have multiple payment attempts.
- Seat status and hold information determine whether inventory can be reserved.

## 5. Preventing Double-Booking with Transactions

The database, not the browser or cache, must decide who owns a seat. Two customers may see a seat as available at nearly the same time. The server must atomically claim it so only one request succeeds.

### Transaction logic for holding a seat

1. The customer submits a request to hold one or more seats.
2. The application begins a database transaction.
3. It locks the requested seat rows using `SELECT ... FOR UPDATE`, acquiring locks in a consistent order to reduce deadlocks.
4. It checks whether each seat is available or has a safely expired hold.
5. If every requested seat is available, the application creates a pending order and its order items.
6. It updates the seats to `HELD`, records the holding order, and sets a hold expiration time.
7. It commits the transaction only if all requested seats were held successfully.
8. If any seat is unavailable, the application rolls back the transaction and returns `409 Conflict`.

This all-or-nothing process prevents a customer from receiving only part of a multi-seat reservation.

### Example: Two customers request the same seat

Assume Customer A and Customer B both request seat 501 at nearly the same time.

1. Customer A's transaction locks seat 501 first.
2. Customer B's transaction must wait for the row lock.
3. Customer A checks availability, changes the seat to `HELD`, and commits.
4. Customer B obtains the lock and sees that the seat is already held.
5. Customer B receives `409 Conflict`; the customer cannot overwrite the first hold.

Only Customer A gets the hold.

### Conditional update as an additional safeguard

A seat can also be claimed with an atomic conditional update:

```sql
UPDATE seats
SET status = 'HELD',
    held_by_order_id = :order_id,
    hold_expires_at = :expires_at
WHERE id = :seat_id
  AND status = 'AVAILABLE';
```

The application checks the affected-row count. Exactly one updated row means the claim succeeded. Zero updated rows means the seat was not available under that condition, so the transaction must not treat it as reserved.

Expired holds require their own safe conditional-update or row-lock logic. The application must not assume a seat is available simply because its displayed expiration time has passed.

### Payment and confirmation

A hold may last five minutes. After verified payment success, the application starts a transaction, verifies the order and hold state, and changes the order to `CONFIRMED` and the seats to `SOLD`.

Payment callbacks must be authenticated and idempotent so duplicate notifications cannot confirm an order twice. If payment fails or a hold expires, the system releases the seats safely. A late successful payment must be reconciled and may need to be refunded if the seats have already been sold to another customer.

Database constraints, foreign keys, valid state transitions, and uniqueness rules for active reservations provide additional protection. Application checks alone are not enough.

### Fairness during the sale

A virtual waiting room and rate limits reduce the number of customers entering checkout simultaneously. Queue tokens and purchase limits help discourage automated abuse.

These mechanisms improve fairness and reduce load, but they do not guarantee seat ownership. The transaction and database constraints remain the final protection against double-booking.

## 6. Architecture Diagram and Components

```text
+----------------------------+
| Web and Mobile Clients     |
+-------------+--------------+
              |
              v
+----------------------------+
| DNS and CDN                |
| Static and public content  |
+-------------+--------------+
              |
              v
+----------------------------+
| Virtual Waiting Room       |
| Queue tokens and rate limit|
+-------------+--------------+
              |
              v
+----------------------------+
| Load Balancer              |
+-------------+--------------+
              |
        +-----+-----+
        |           |
        v           v
+---------------+ +---------------+
| App Server 1  | | App Server 2  | ... more
+-------+-------+ +-------+-------+
        |                 |
        +--------+--------+
                 |
         +-------+----------+
         |                  |
         v                  v
+----------------+  +-------------------+
| Cache          |  | Primary Database  |
| Public event   |  | Transactions      |
| information    |  | Seat ownership    |
+----------------+  +---------+---------+
                              |
                              v
                    +-------------------+
                    | Read Replica      |
                    | Browsing queries  |
                    +-------------------+

App Servers ---> Job Queue ---> Background Workers
      |
      +--------> Payment Provider
                  and verified callbacks
```

### Component explanations

- **Clients:** Let customers browse events, choose seats, and buy tickets.
- **DNS and CDN:** Route users to the service and cache static assets and suitable public content.
- **Virtual waiting room:** Admits customers to checkout at a controlled rate.
- **Load balancer:** Distributes requests among healthy application servers.
- **Application servers:** Authenticate users, validate requests, create orders, and coordinate database and payment operations. Multiple stateless instances can scale horizontally.
- **Cache:** Reduces repeated reads for public event details. It is not the authority for seat ownership or payment status.
- **Primary database:** Stores authoritative seat, order, and payment state and handles reservation transactions.
- **Read replica:** Handles suitable browsing queries to reduce primary-database load. Since replication can lag, checkout must verify seats against the primary.
- **Job queue:** Buffers background work such as confirmation emails and ticket generation.
- **Background workers:** Process queued jobs with retries and monitoring.
- **Payment provider:** Processes payments securely and sends verified callbacks to update order state.

### Surviving the big sale

TicketHub should scale application servers horizontally, use a waiting room to control checkout admission, and cache popular public event information. Rate limits protect the service from excessive requests, while background queues keep non-essential work out of the critical purchase path.

The primary database must be load-tested for row-lock contention, transaction latency, and connection limits. Connection pooling and consistent lock ordering help reduce database pressure and deadlocks. Monitoring should track queue length, failed purchases, payment delays, and database performance.

The system must not allow unlimited checkout traffic merely because more web servers can be added. The database's safe processing capacity determines how quickly customers should be admitted. Backups, recovery procedures, and tested failover plans improve resilience.

## 7. Trade-offs

### Trade-off 1: Fairness versus immediate access

A waiting room controls traffic and provides a more orderly sale, but customers may have to wait before buying. The design must balance fairness, queue time, usability, and bot prevention.

### Trade-off 2: Strong consistency versus speed

Database locks and transactions prevent two customers from claiming the same seat, but they add latency when many requests compete for the same inventory. TicketHub should accept some checkout latency to preserve correct ticket ownership.

### Trade-off 3: Short holds versus customer convenience

Short holds free inventory quickly, but customers may lose seats if payment takes too long. Longer holds give customers more time but reduce availability for others. TicketHub should set a reasonable hold duration and handle delayed payments carefully.

### Trade-off 4: Caching versus freshness

Caching improves speed and reduces database load, but cached information may be stale. Event descriptions can be cached, while seat availability must be checked against the primary database during checkout.

## Conclusion

TicketHub must combine scalable event browsing with a strongly consistent purchase workflow. Normal traffic averages approximately 5.8 page requests per second, while the specified big-sale period generates about 333 initial purchase attempts per second.

A waiting room, CDN, cache, load balancer, scalable application servers, and background workers help manage traffic. Database transactions, row locks, conditional updates, and uniqueness constraints prevent double-booking. Reliable payment processing, monitoring, retries, and recovery plans protect the platform when demand is highest.
