# Library Books API

This API manages books in a library system.

## Endpoints

### 1. List all books

* **Method:** GET
* **Path:** `/api/books`
* **Description:** Returns a list of all books.
* **Success status:** `200 OK`

Example request:

```http
GET /api/books
```

---

### 2. Get one book

* **Method:** GET
* **Path:** `/api/books/{id}`
* **Description:** Returns the details of one book using its ID.
* **Success status:** `200 OK`

Example request:

```http
GET /api/books/1
```

---

### 3. Create a book

* **Method:** POST
* **Path:** `/api/books`
* **Description:** Creates a new book.
* **Success status:** `201 Created`

Example request body:

```json
{
    "title": "Things Fall Apart",
    "author": "Chinua Achebe",
    "year": 1958
}
```

---

### 4. Update a book

* **Method:** PUT
* **Path:** `/api/books/{id}`
* **Description:** Updates an existing book using its ID.
* **Success status:** `200 OK`

Example request body:

```json
{
    "title": "Things Fall Apart",
    "author": "Chinua Achebe",
    "year": 1958
}
```

---

### 5. Delete a book

* **Method:** DELETE
* **Path:** `/api/books/{id}`
* **Description:** Deletes a book using its ID.
* **Success status:** `204 No Content`

Example request:

```http
DELETE /api/books/1
```

---

### 6. List books by author

* **Method:** GET
* **Path:** `/api/books?author={author}`
* **Description:** Returns books written by the specified author.
* **Success status:** `200 OK`

Example request:

```http
GET /api/books?author=Chinua%20Achebe
```

## Error Codes

### 400 Bad Request

The request is invalid or contains missing or incorrect data.

### 404 Not Found

The requested book or resource does not exist.
