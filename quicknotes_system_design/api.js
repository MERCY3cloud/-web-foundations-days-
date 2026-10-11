
const API_URL = "https://jsonplaceholder.typicode.com/posts";

const loadButton = document.getElementById("load-btn");
const statusMessage = document.getElementById("status");
const notesList = document.getElementById("notes-list");
const noteForm = document.getElementById("note-form");
const submitButton = document.getElementById("submit-btn");

function setStatus(message, type = "") {
    statusMessage.textContent = message;
    statusMessage.className = type;
}

async function request(url, options = {}) {
    const response = await fetch(url, options);

    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }

    return {
        data: response.status === 204 ? null : await response.json(),
        status: response.status
    };
}

function renderNote(note) {
    const item = document.createElement("li");
    item.className = "note-item";

    const title = document.createElement("h3");
    title.textContent = note.title || "Untitled note";

    const body = document.createElement("p");
    body.textContent = note.body || "No note body.";

    item.append(title, body);
    return item;
}

async function loadNotes() {
    loadButton.disabled = true;
    setStatus("Loading notes...");

    try {
        const result = await request(`${API_URL}?_limit=10`);

        notesList.replaceChildren();

        if (result.data.length === 0) {
            setStatus("No notes found. Create your first note.");
            return;
        }

        result.data.forEach(note => {
            notesList.appendChild(renderNote(note));
        });

        setStatus(`Loaded ${result.data.length} notes from the server.`, "success");
    } catch (error) {
        setStatus("Unable to load notes. Please check your connection and try again.", "error");
        console.error(error);
    } finally {
        loadButton.disabled = false;
    }
}

loadButton.addEventListener("click", loadNotes);

// POST and DELETE will be added in the next steps.
noteForm.addEventListener("submit", event => {
    event.preventDefault();
    setStatus("Creating notes will be enabled in the next step.");
});

setStatus("Click “Load notes” to get started.");
