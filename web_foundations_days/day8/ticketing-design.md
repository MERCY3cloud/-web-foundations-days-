

\# TicketHub: Event Ticketing System Design



\## 1. Requirements



TicketHub is a website where users discover events, view available seats, purchase tickets, and access their orders. The system must support two million registered users and remain reliable when a popular concert goes on sale.



\### Functional requirements



1\. Users can register, sign in, and manage their accounts.

2\. Users can browse events and view event details, dates, venues, and prices.

3\. Users can view a seat map and see which seats are available, held, or sold.

4\. Users can temporarily hold available seats while completing checkout.

5\. Users can pay for an order and receive confirmation when payment succeeds.

6\. Users can view their purchased tickets and order history.

7\. The system releases expired seat holds so other customers can purchase those seats.

8\. Administrators can create events, configure seating, and manage ticket availability.



\### Non-functional requirements



\*\*Speed:\*\* Event pages and seat maps should load quickly under normal traffic. The system should respond gracefully during a major sale instead of becoming unavailable.



\*\*Correctness:\*\* A seat must never be sold to two different customers. The system must maintain accurate order, payment, and seat-status records.



\*\*Fairness:\*\* Customers should receive fair access during a popular sale. Rate limiting, a virtual waiting room, and a queue that processes customers in order can reduce the advantage of automated clients and prevent everyone from overwhelming checkout simultaneously.



\*\*Availability:\*\* Event browsing should remain available where possible, even if purchasing traffic becomes unusually high.



\*\*Security:\*\* Authentication, authorization, HTTPS, input validation, payment-provider integration, and protection against repeated requests are required. The system must not store raw payment-card details.



\*\*Scalability:\*\* Application servers and background workers should scale horizontally to handle increasing traffic.



\*\*Observability:\*\* Logs, metrics, alerts, and tracing should help engineers detect errors, queue delays, failed payments, and unusual traffic.



\## 2. Traffic and Capacity Estimates



\### Given assumptions



\- Registered users: 2,000,000.

\- Normal daily visitors: 50,000.

\- Pages viewed per visitor: 10.

\- Normal ticket sales: 5,000 per day.

\- Big sale audience: 200,000 people trying to buy 20,000 seats within 10 minutes.

\- A day contains 86,400 seconds.

\- The normal-day calculations below use average traffic across 24 hours. Actual traffic will vary by time of day.

\- The big-sale estimate assumes each of the 200,000 people makes one initial purchase attempt during the 10-minute period. Additional retries and seat-map refreshes could increase the real request volume.



\### Normal-day traffic



Daily page requests:



50,000 visitors × 10 pages = 500,000 page requests per day.



Average page request rate:



500,000 / 86,400 = approximately 5.8 requests per second.



Normal ticket sales:



5,000 / 86,400 = approximately 0.058 tickets per second, or about 208 tickets per hour on average.



The page-request estimate does not include every API call, such as loading event details, checking seat availability, or processing payment. The actual total request rate will therefore be higher.



\### Big-sale traffic



200,000 people attempt to buy tickets within 10 minutes.



Ten minutes = 600 seconds.



Average initial purchase-attempt rate during the sale:



200,000 / 600 = approximately 333 attempts per second.



The event has only 20,000 seats. If every seat is sold, at most 20,000 successful ticket purchases can be completed for that event.



Demand exceeds supply by:



200,000 potential buyers / 20,000 seats = 10 potential buyers per seat.



Only 10% of the people attempting to buy can obtain a seat if all 20,000 seats are available and sold.



\### Comparison



| Metric | Normal day | Big sale |

|---|---:|---:|

| Visitors or attempted buyers | 50,000/day | 200,000/10 min |

| Page requests or purchase attempts | 500,000/day | 200,000 initial attempts |

| Average rate | 5.8 page requests/second | 333 purchase attempts/second |

| Ticket supply | Normal inventory | 20,000 seats |

| Main challenge | Efficient everyday browsing | Extreme demand and seat contention |



The big-sale initial purchase-attempt rate is approximately 57 times the normal average page-request rate. This is a comparison of the specified averages, not a claim that both rates measure exactly the same kind of request.



TicketHub should use a waiting room, rate limits, caching, and horizontally scalable application servers. The database must enforce seat availability because adding more application servers alone cannot prevent two customers from buying the same seat.



\## 3. API Design



The API uses REST conventions and JSON request and response bodies. All purchasing endpoints require authentication.



\### Endpoint 1: Browse events



\- Method: GET

\- Path: `/api/events`

\- Purpose: Return a paginated list of upcoming events.

\- Success status: `200 OK`



Example response:



```json

{

&#x20; "events": \[

&#x20;   {

&#x20;     "id": 101,

&#x20;     "name": "Summer Music Festival",

&#x20;     "venue": "City Arena",

&#x20;     "date": "2027-06-15",

&#x20;     "status": "ON\_SALE"

&#x20;   }

&#x20; ],

&#x20; "page": 1,

&#x20; "total": 1

}

```



\### Endpoint 2: View seats for an event



\- Method: GET

\- Path: `/api/events/{eventId}/seats`

\- Purpose: Return seat identifiers, prices, and current availability.

\- Success status: `200 OK`



Example response:



```json

{

&#x20; "eventId": 101,

&#x20; "seats": \[

&#x20;   {

&#x20;     "id": 501,

&#x20;     "label": "A1",

&#x20;     "price": 5000,

&#x20;     "status": "AVAILABLE"

&#x20;   },

&#x20;   {

&#x20;     "id": 502,

&#x20;     "label": "A2",

&#x20;     "price": 5000,

&#x20;     "status": "HELD"

&#x20;   }

&#x20; ]

}

```



Availability shown on the seat map is informational and can change at any time. The hold endpoint must verify availability again in the database.



\### Endpoint 3: Hold seats



\- Method: POST

\- Path: `/api/orders/holds`

\- Purpose: Temporarily reserve one or more seats for an authenticated customer.

\- Success status: `201 Created`



Example request:



```json

{

&#x20; "eventId": 101,

&#x20; "seatIds": \[501],

&#x20; "idempotencyKey": "checkout-abc-123"

}

```



Example response:



```json

{

&#x20; "orderId": 9001,

&#x20; "status": "PENDING\_PAYMENT",

&#x20; "expiresAt": "2027-06-15T12:05:00Z"

}

```



If a requested seat is already sold or held by another customer, the API returns `409 Conflict`. The operation must hold all requested seats successfully or none of them.



\### Endpoint 4: Pay for an order



\- Method: POST

\- Path: `/api/orders/{orderId}/payments`

\- Purpose: Start payment through a trusted payment provider and confirm the order only after verified payment success.

\- Success status: `202 Accepted` while payment is being processed, or `200 OK` when a synchronous result is available.



Example request:



```json

{

&#x20; "paymentMethodToken": "provider-token-example",

&#x20; "idempotencyKey": "payment-9001-abc"

}

```



Example response:



```json

{

&#x20; "orderId": 9001,

&#x20; "paymentStatus": "PROCESSING"

}

```



A verified payment-provider callback or webhook updates the final payment status. The system must authenticate callbacks and process duplicate notifications safely.



\### Endpoint 5: View an order



\- Method: GET

\- Path: `/api/orders/{orderId}`

\- Purpose: Show the authenticated customer's order and payment status.

\- Success status: `200 OK`



Example response:



```json

{

&#x20; "orderId": 9001,

&#x20; "status": "CONFIRMED",

&#x20; "totalAmount": 5000,

&#x20; "currency": "KES"

}

```



\### Endpoint 6: View my tickets



\- Method: GET

\- Path: `/api/me/tickets`

\- Purpose: List tickets owned by the authenticated customer.

\- Success status: `200 OK`



Example response:



```json

{

&#x20; "tickets": \[

&#x20;   {

&#x20;     "ticketId": 7001,

&#x20;     "eventId": 101,

&#x20;     "seatId": 501,

&#x20;     "status": "VALID"

&#x20;   }

&#x20; ]

}

```



\### Common error responses



\- `400 Bad Request`: Missing or invalid fields.

\- `401 Unauthorized`: User is not authenticated.

\- `403 Forbidden`: User cannot access the requested resource.

\- `404 Not Found`: Event, seat, or order does not exist.

\- `409 Conflict`: Seat is unavailable or an order has already changed state.

\- `429 Too Many Requests`: The client has exceeded its rate limit.

\- `500 Internal Server Error`: An unexpected server failure occurred.



\## 4. Data Model



TicketHub uses a relational database such as PostgreSQL because ticket purchases require strong consistency, transactions, foreign keys, and uniqueness constraints.



The four core tables are `users`, `events`, `seats`, and `orders`. A separate `order\_items` table connects orders to individual seats, while a `payments` table records payment attempts and results.



\### Table 1: users



| Column | Type | Purpose |

|---|---|---|

| id | BIGINT PRIMARY KEY | Unique user identifier |

| name | VARCHAR(100) | Customer's name |

| email | VARCHAR(255) UNIQUE NOT NULL | Login email |

| password\_hash | VARCHAR(255) | Securely hashed password |

| created\_at | TIMESTAMP | Account creation time |



\### Table 2: events



| Column | Type | Purpose |

|---|---|---|

| id | BIGINT PRIMARY KEY | Unique event identifier |

| name | VARCHAR(200) NOT NULL | Event name |

| venue | VARCHAR(200) NOT NULL | Event location |

| starts\_at | TIMESTAMP NOT NULL | Event start time |

| status | VARCHAR(30) NOT NULL | Draft, on sale, or cancelled |

| created\_at | TIMESTAMP | Record creation time |



\### Table 3: seats



Each seat represents a specific seat at a particular event. A venue with different events can therefore have separate seat records for each event.



| Column | Type | Purpose |

|---|---|---|

| id | BIGINT PRIMARY KEY | Unique event-seat identifier |

| event\_id | BIGINT REFERENCES events(id) | Event that owns the seat |

| seat\_label | VARCHAR(20) NOT NULL | Seat label, such as A1 |

| price | NUMERIC(10,2) NOT NULL | Ticket price |

| status | VARCHAR(20) NOT NULL | AVAILABLE, HELD, or SOLD |

| held\_by\_order\_id | BIGINT NULL | Order holding the seat |

| hold\_expires\_at | TIMESTAMP NULL | Time the temporary hold expires |



The combination of `event\_id` and `seat\_label` must be unique. This prevents duplicate seat definitions for the same event.



\### Table 4: orders



| Column | Type | Purpose |

|---|---|---|

| id | BIGINT PRIMARY KEY | Unique order identifier |

| user\_id | BIGINT REFERENCES users(id) | Customer who placed the order |

| status | VARCHAR(30) NOT NULL | PENDING\_PAYMENT, CONFIRMED, EXPIRED, or CANCELLED |

| total\_amount | NUMERIC(12,2) NOT NULL | Total order amount |

| created\_at | TIMESTAMP | Order creation time |

| expires\_at | TIMESTAMP NULL | Payment deadline |



\### Table 5: order\_items



| Column | Type | Purpose |

|---|---|---|

| id | BIGINT PRIMARY KEY | Unique order item |

| order\_id | BIGINT REFERENCES orders(id) | Parent order |

| seat\_id | BIGINT REFERENCES seats(id) | Seat purchased or held |

| price\_at\_purchase | NUMERIC(10,2) NOT NULL | Price agreed for this item |



A unique constraint on `seat\_id` ensures a seat can be linked to only one order item in this simplified model. If cancelled orders must release seats for resale, the application must handle that lifecycle carefully; a production schema can instead enforce uniqueness for active reservations and maintain a separate ticket history.



\### Table 6: payments



| Column | Type | Purpose |

|---|---|---|

| id | BIGINT PRIMARY KEY | Unique payment attempt |

| order\_id | BIGINT REFERENCES orders(id) | Related order |

| provider\_reference | VARCHAR(255) UNIQUE | Payment-provider transaction reference |

| amount | NUMERIC(12,2) NOT NULL | Amount charged |

| status | VARCHAR(30) NOT NULL | PENDING, SUCCEEDED, or FAILED |

| created\_at | TIMESTAMP | Payment attempt time |



\### Relationships



\- One user can create many orders.

\- One event has many seats.

\- One order can contain multiple order items.

\- Each order item refers to one seat.

\- One order can have multiple payment attempts.

\- A seat's current hold and sale state is tracked in the `seats` table.



\## 5. Preventing Double-Booking



Preventing two people from buying the same seat is the most important correctness requirement.



A seat map can become outdated between the time it is displayed and the time the customer clicks a seat. Therefore, the server must never trust the availability shown in the browser. It must check and claim the seat atomically in the database.



\### Transaction-based seat holding



When a customer requests a seat hold, the application starts a database transaction.



1\. It validates the customer, event, requested seats, and sale rules.

2\. It locks the relevant seat rows in a consistent order, using a mechanism such as `SELECT ... FOR UPDATE`.

3\. It checks that each seat is available or has a genuinely expired hold.

4\. It creates a pending order and its order items.

5\. It changes the selected seats to `HELD`, records the holding order, and sets an expiration time.

6\. It commits the transaction only if all requested seats were successfully held.



If any seat is unavailable, the transaction rolls back so that the customer does not receive a partial hold.



An alternative is a conditional atomic update:



```sql

UPDATE seats

SET status = 'HELD',

&#x20;   held\_by\_order\_id = :order\_id,

&#x20;   hold\_expires\_at = :expires\_at

WHERE id = :seat\_id

&#x20; AND status = 'AVAILABLE';

```



The application must verify that exactly one row was updated. If zero rows were updated, another transaction may already have claimed the seat, so the request must fail with `409 Conflict`. Expired holds must be handled using an equally safe conditional update or row lock.



\### Database constraints



The database also enforces unique seat labels per event and appropriate foreign keys. These constraints protect the data even when application requests arrive simultaneously.



A transaction alone is not enough if the application does not check the result of its conditional update or if database constraints are missing. Both application logic and database safeguards are required.



\### Payment and seat confirmation



A hold lasts for a limited period, such as five minutes. The payment workflow must account for payment delays and expiration.



After the payment provider confirms success, the application verifies that the payment corresponds to the correct order and amount, then changes the order to `CONFIRMED` and the seats to `SOLD` within a transaction. Repeated payment callbacks must not create duplicate confirmations.



If payment fails or the hold expires before a successful payment is accepted, the seats should be released safely. A payment that succeeds late must be reconciled rather than blindly confirming a seat that has already been sold to someone else. The system may need to void or refund such a payment.



\### Fairness during the sale



A virtual waiting room limits the number of customers entering checkout at once. Queue tokens, rate limits, and per-customer purchase limits help control automated traffic and provide more orderly access.



The queue controls who may attempt a purchase, but the database remains the final authority on seat ownership.



\## 6. Architecture Diagram and Components



```text

+-----------------------------+

| Web / Mobile Clients        |

+--------------+--------------+

&#x20;              |

&#x20;              v

+-----------------------------+

| DNS and CDN                 |

| Static assets and caching   |

+--------------+--------------+

&#x20;              |

&#x20;              v

+-----------------------------+

| Virtual Waiting Room        |

| Queue tokens and rate limit |

+--------------+--------------+

&#x20;              |

&#x20;              v

+-----------------------------+

| Load Balancer               |

+--------------+--------------+

&#x20;              |

&#x20;      +-------+-------+

&#x20;      |               |

&#x20;      v               v

+-------------+ +-------------+

| App Server 1| | App Server 2|   ... more instances

+------+------+ +------+------+

&#x20;      |               |

&#x20;      +-------+-------+

&#x20;              |

&#x20;      +-------+--------------------+

&#x20;      |                            |

&#x20;      v                            v

+------------------+      +-------------------+

| Cache            |      | Primary Database  |

| Event information|      | Transactions      |

+------------------+      | Seat constraints  |

&#x20;                         +---------+---------+

&#x20;                                   |

&#x20;                                   v

&#x20;                         +-------------------+

&#x20;                         | Read Replica      |

&#x20;                         | Browsing queries  |

&#x20;                         +-------------------+



App Servers

&#x20;    |

&#x20;    v

+-------------------+       +------------------+

| Job Queue         |------>| Background Worker|

| Notifications     |       | Emails and jobs  |

+-------------------+       +------------------+



App Servers

&#x20;    |

&#x20;    v

+-------------------+

| Payment Provider  |

| Verified webhooks |

+-------------------+

```



\### Component explanations



\- \*\*Web and mobile clients:\*\* Let customers browse events, choose seats, and complete checkout.

\- \*\*DNS and CDN:\*\* Route users to the service and cache static assets and safe-to-cache public event information. Seat availability and personal order data must not be served from an inappropriate shared cache.

\- \*\*Virtual waiting room:\*\* Smooths the arrival of a large crowd by allowing controlled admission to the purchasing workflow.

\- \*\*Load balancer:\*\* Distributes admitted requests across healthy application-server instances.

\- \*\*Application servers:\*\* Validate requests, authenticate users, enforce sale rules, create orders, and coordinate database and payment operations. Multiple stateless instances can scale horizontally.

\- \*\*Cache:\*\* Reduces repeated database reads for popular event descriptions and other suitable public data. It is not the source of truth for seat ownership.

\- \*\*Primary database:\*\* Handles transactions that hold and sell seats. It enforces constraints and maintains authoritative order and seat states.

\- \*\*Read replica:\*\* Supports eligible browsing queries and reduces read load on the primary database. It may lag behind the primary, so checkout must verify current availability against the primary.

\- \*\*Job queue:\*\* Buffers asynchronous work such as confirmation emails and ticket-generation tasks, allowing the purchase request to finish without waiting for every background task.

\- \*\*Background workers:\*\* Process queued work with retries and monitoring.

\- \*\*Payment provider:\*\* Processes payment securely. Verified callbacks update payment status, with idempotency safeguards against duplicate notifications.



\### Surviving the big sale



TicketHub should scale application servers horizontally and use a waiting room to keep the rate of checkout requests within the database's safe operating capacity. The system should cache public event data, rate-limit abusive traffic, and use queues for work that does not need to occur during the critical purchase transaction.



The database must be load-tested for seat-lock contention, transaction latency, and connection limits. Connections should be pooled, and multi-seat locks should be acquired in a consistent order to reduce deadlocks. Monitoring should alert engineers when the waiting room grows, payment errors increase, or the database becomes saturated.



The primary database may still become a bottleneck, so the system must not admit unlimited checkout requests just because more application servers are available. Capacity limits, graceful degradation, backups, recovery procedures, and tested failover plans are essential.



\## 7. Trade-offs



\### Trade-off 1: Fairness versus immediate access



A virtual waiting room helps control sudden traffic and creates a more orderly sale. However, some customers must wait even when the site has enough capacity for their individual request. Queue design must balance fairness, queue time, bot prevention, and usability.



\### Trade-off 2: Strong consistency versus performance



Checking and locking seats in the primary database protects against double-booking, but row locks and transactions add latency during busy sales. Using a read replica for browsing improves performance, but replica lag means it cannot decide whether a seat is safe to sell. The system should accept some checkout latency in exchange for correct ticket ownership.



\### Trade-off 3: Short holds versus customer convenience



Short seat holds release inventory quickly and prevent customers from blocking seats indefinitely. However, customers may lose their seats if payment takes too long. A longer hold improves checkout convenience but reduces the amount of inventory available to other buyers. TicketHub should choose a reasonable expiration time and handle delayed payments carefully.



\### Trade-off 4: Caching versus freshness



Caching event information reduces load and improves page speed. However, cached information can be stale. Public descriptions can have longer cache lifetimes, while seat availability should be revalidated against the primary database when a customer attempts to hold a seat.



\## Conclusion



TicketHub must combine a scalable browsing experience with a strongly consistent ticket-purchasing process. Traffic estimates show that a popular sale can generate hundreds of initial purchase attempts per second and demand far beyond available inventory.



A waiting room, load balancer, scalable application servers, cache, queue, and read replica help absorb traffic. Database transactions, row locks, conditional updates, and constraints prevent double-booking. Clear expiration rules, idempotent payment handling, monitoring, and recovery procedures protect correctness and reliability during the busiest events.



