let notes = [
{ id: 1, text: "Buy milk and bread", category: "personal" },
{ id: 2, text: "Finish the Day 3 assignment", category: "study" },
{ id: 3, text: "Email the project report to Grace", category: "work" },
{ id: 4, text: "Revise JavaScript arrays", category: "study" },
{ id: 5, text: "Call mum", category: "personal" },
];

// 1. Search notes
function searchNotes(word) {
return notes.filter(note =>
note.text.toLowerCase().includes(word.toLowerCase())
);
}

// 2. Find the longest note
function longestNote() {
if (notes.length === 0) {
return null;
}


let longest = notes[0];

for (let note of notes) {
    if (note.text.length > longest.text.length) {
        longest = note;
    }
}

return longest;


}

// 3. Count notes by category
function countByCategory() {
let counts = {};


for (let note of notes) {
    if (counts[note.category]) {
        counts[note.category]++;
    } else {
        counts[note.category] = 1;
    }
}

return counts;


}

// 4. Get notes summary
function getSummary() {
const counts = countByCategory();
const total = notes.length;


const noteWord = total === 1 ? "note" : "notes";

return `${total} ${noteWord}: ${counts.personal || 0} personal, ${counts.work || 0} work, ${counts.study || 0} study.`;


}

// 5. Check for duplicate note
function isDuplicate(text) {
const normalText = text.trim().toLowerCase();


return notes.some(note =>
    note.text.trim().toLowerCase() === normalText
);


}

// 6. Add a new note
function addNote(text, category) {
const trimmedText = text.trim();
const validCategories = ["personal", "work", "study"];


if (trimmedText.length < 1 || trimmedText.length > 200) {
    console.log("Note must be between 1 and 200 characters.");
    return false;
}

if (isDuplicate(trimmedText)) {
    console.log("Note is a duplicate.");
    return false;
}

if (!validCategories.includes(category)) {
    console.log("Invalid category.");
    return false;
}

const newNote = {
    id: notes.length + 1,
    text: trimmedText,
    category: category
};

notes.push(newNote);

console.log("Note added successfully.");
return true;


}

// =============================
// TESTS
// =============================

// searchNotes
console.log(searchNotes("DAY"));
// Expected: [{ id: 2, text: "Finish the Day 3 assignment", category: "study" }]

console.log(searchNotes("pizza"));
// Expected: []

// longestNote
console.log(longestNote());
// Expected: the note object with text "Email the project report to Grace"

notes = [];
console.log(longestNote());
// Expected: null

// Restore starting notes for the remaining tests
notes = [
{ id: 1, text: "Buy milk and bread", category: "personal" },
{ id: 2, text: "Finish the Day 3 assignment", category: "study" },
{ id: 3, text: "Email the project report to Grace", category: "work" },
{ id: 4, text: "Revise JavaScript arrays", category: "study" },
{ id: 5, text: "Call mum", category: "personal" },
];

// countByCategory
console.log(countByCategory());
// Expected: { personal: 2, study: 2, work: 1 }

notes = [];
console.log(countByCategory());
// Expected: {}

// Restore notes
notes = [
{ id: 1, text: "Buy milk and bread", category: "personal" },
{ id: 2, text: "Finish the Day 3 assignment", category: "study" },
{ id: 3, text: "Email the project report to Grace", category: "work" },
{ id: 4, text: "Revise JavaScript arrays", category: "study" },
{ id: 5, text: "Call mum", category: "personal" },
];

// getSummary
console.log(getSummary());
// Expected: "5 notes: 2 personal, 1 work, 2 study."

notes = [
{ id: 1, text: "Call mum", category: "personal" }
];

console.log(getSummary());
// Expected: "1 note: 1 personal, 0 work, 0 study."

// Restore notes
notes = [
{ id: 1, text: "Buy milk and bread", category: "personal" },
{ id: 2, text: "Finish the Day 3 assignment", category: "study" },
{ id: 3, text: "Email the project report to Grace", category: "work" },
{ id: 4, text: "Revise JavaScript arrays", category: "study" },
{ id: 5, text: "Call mum", category: "personal" },
];

// isDuplicate
console.log(isDuplicate("  BUY MILK AND BREAD  "));
// Expected: true

console.log(isDuplicate("Go to the gym"));
// Expected: false

// addNote
console.log(addNote("Prepare presentation slides", "work"));
// Expected: true

console.log(addNote("  Buy milk and bread  ", "personal"));
// Expected: false, with reason "Note is a duplicate."

console.log(addNote("", "study"));
// Expected: false, with reason "Note must be between 1 and 200 characters."

console.log(addNote("Learn Python", "shopping"));
// Expected: false, with reason "Invalid category."
