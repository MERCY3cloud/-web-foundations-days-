
const API_URL = "https://jsonplaceholder.typicode.com/posts";

const loadButton = document.getElementById("load-btn");
const noteForm = document.getElementById("note-form");
const titleInput = document.getElementById("title-input");
const bodyInput = document.getElementById("body-input");
const submitButton = document.getElementById("submit-btn");
const statusMessage = document.getElementById("status");
const notesList = document.getElementById("notes-list");

let notes = [];
let isBusy = false;

// Reusable function for sending API requests.
async function request(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers
        }
    });

    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
}

// Display loading, success, and error messages.
function showStatus(message, type = "") {
    statusMessage.textContent = message;
    statusMessage.className = type;
}

// Disable buttons while a request is running.
function setBusy(busy) {
    isBusy = busy;

    document.querySelectorAll("button").forEach((button) => {
        button.disabled = busy;
    });
}

// Create a note element safely using textContent.
function createNoteElement(note) {
    const item = document.createElement("li");
    item.className = "note-item";

    const title = document.createElement("h3");
    title.textContent = note.title || "Untitled note";

    const body = document.createElement("p");
    body.textContent = note.body || "No body provided.";

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-btn";
    deleteButton.textContent = "Delete";

    deleteButton.addEventListener("click", () => {
        deleteNote(note.id);
    });

    item.append(title, body, deleteButton);
    return item;
}

// Render all notes. The list can be empty.
function renderNotes() {
    notesList.replaceChildren();

    if (notes.length === 0) {
        const emptyItem = document.createElement("li");
        emptyItem.textContent = "No notes found. Create your first note!";
        emptyItem.className = "empty-state";
        notesList.appendChild(emptyItem);
        return;
    }

    notes.forEach((note) => {
        notesList.appendChild(createNoteElement(note));
    });
}

// GET: Load the first 10 notes.
async function loadNotes() {
    if (isBusy) return;

    setBusy(true);
    showStatus("Loading notes...");

    try {
        notes = await request(`${API_URL}?_limit=10`);
        renderNotes();

        showStatus(
            notes.length > 0
                ? `Successfully loaded ${notes.length} notes.`
                : "No notes found.",
            "success"
        );
    } catch (error) {
        showStatus(`Could not load notes: ${error.message}`, "error");
    } finally {
        setBusy(false);
    }
}

// POST: Validate and create a note.
async function createNote(event) {
    event.preventDefault();

    if (isBusy) return;

    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();

    if (!title) {
        showStatus("Please enter a note title.", "error");
        titleInput.focus();
        return;
    }

    if (title.length > 100) {
        showStatus("The title must be 100 characters or fewer.", "error");
        titleInput.focus();
        return;
    }

    setBusy(true);
    showStatus("Creating your note...");

    try {
        const newNote = await request(API_URL, {
            method: "POST",
            body: JSON.stringify({
                title,
                body,
                userId: 1
            })
        });

        // JSONPlaceholder simulates creation and returns a new ID.
        notes.unshift(newNote);
        renderNotes();
        noteForm.reset();

        showStatus("Note created successfully!", "success");
    } catch (error) {
        showStatus(`Could not create note: ${error.message}`, "error");
    } finally {
        setBusy(false);
    }
}

// DELETE: Delete a note through the API.
async function deleteNote(id) {
    if (isBusy) return;

    setBusy(true);
    showStatus("Deleting note...");

    try {
        await request(`${API_URL}/${encodeURIComponent(id)}`, {
            method: "DELETE"
        });

        notes = notes.filter((note) => note.id !== id);
        renderNotes();

        showStatus("Note deleted successfully.", "success");
    } catch (error) {
        showStatus(`Could not delete note: ${error.message}`, "error");
    } finally {
        setBusy(false);
    }
}

loadButton.addEventListener("click", loadNotes);
noteForm.addEventListener("submit", createNote);
