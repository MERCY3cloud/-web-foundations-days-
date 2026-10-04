let notes = [
    { id: 1, text: "Buy milk and bread", category: "personal" },
    { id: 2, text: "Finish the Day 3 assignment", category: "study" },
    { id: 3, text: "Email the project report to Grace", category: "work" },
    { id: 4, text: "Revise JavaScript arrays", category: "study" },
    { id: 5, text: "Call mum", category: "personal" },
];

function searchNotes(word) {
    const searchWord = word.toLowerCase();

    return notes.filter(note =>
        note.text.toLowerCase().includes(searchWord)
    );
}

function longestNote() {
    if (notes.length === 0) {
        return null;
    }

    let longest = notes[0];

    for (const note of notes) {
        if (note.text.length > longest.text.length) {
            longest = note;
        }
    }

    return longest;
}

function countByCategory() {
    const counts = {};

    for (const note of notes) {
        if (counts[note.category] === undefined) {
            counts[note.category] = 0;
        }

        counts[note.category]++;
    }

    return counts;
}

function getSummary() {
    const counts = countByCategory();
    const word = notes.length === 1 ? "note" : "notes";

    return `${notes.length} ${word}: ${counts.personal || 0} personal, ${counts.work || 0} work, ${counts.study || 0} study.`;
}

function isDuplicate(text) {
    const cleanedText = text.trim().toLowerCase();

    return notes.some(note =>
        note.text.trim().toLowerCase() === cleanedText
    );
}

function addNote(text, category) {
    const cleanedText = text.trim();

    if (cleanedText.length < 1 || cleanedText.length > 200) {
        console.log("Note must be between 1 and 200 characters.");
        return false;
    }

    if (isDuplicate(cleanedText)) {
        console.log("Note already exists.");
        return false;
    }

    const validCategories = ["personal", "work", "study"];

    if (!validCategories.includes(category)) {
        console.log("Invalid category.");
        return false;
    }

    const newId = notes.length === 0
        ? 1
        : Math.max(...notes.map(note => note.id)) + 1;

    notes.push({
        id: newId,
        text: cleanedText,
        category: category
    });

    return true;
}


// ==========================
// TESTS
// ==========================

// searchNotes
console.log(
    searchNotes("javascript")
);
// Expected: [{ id: 4, text: "Revise JavaScript arrays", category: "study" }]

console.log(
    searchNotes("pizza")
);
// Expected: []

// longestNote
console.log(
    longestNote()
);
// Expected: the note "Email the project report to Grace"

let savedNotes = notes;
notes = [];

console.log(
    longestNote()
);
// Expected: null

notes = savedNotes;

// countByCategory
console.log(
    countByCategory()
);
// Expected: { personal: 2, study: 2, work: 1 }

console.log(
    countByCategory()["unknown"]
);
// Expected: undefined

// getSummary
console.log(
    getSummary()
);
// Expected: "5 notes: 2 personal, 1 work, 2 study."

savedNotes = notes;
notes = [
    { id: 1, text: "Single note", category: "personal" }
];

console.log(
    getSummary()
);
// Expected: "1 note: 1 personal, 0 work, 0 study."

notes = savedNotes;

// isDuplicate
console.log(
    isDuplicate("  BUY MILK AND BREAD  ")
);
// Expected: true

console.log(
    isDuplicate("Buy pizza")
);
// Expected: false

// addNote
console.log(
    addNote("Finish the JavaScript homework", "study")
);
// Expected: true

console.log(
    addNote("Buy milk and bread", "personal")
);
// Expected: false because the note already exists