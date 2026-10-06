-- Day 6 Assignment: A School Database

-- 1. CREATE TABLES

CREATE TABLE students (
    student_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
);

CREATE TABLE courses (
    course_id INTEGER PRIMARY KEY,
    course_name TEXT NOT NULL
);

CREATE TABLE enrolments (
    enrolment_id INTEGER PRIMARY KEY,
    student_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    grade TEXT,

    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (course_id) REFERENCES courses(course_id),

    UNIQUE (student_id, course_id)
);


-- 2. INSERT SAMPLE DATA

INSERT INTO students (student_id, name, email) VALUES
(1, 'Alice Wanjiku', 'alice@example.com'),
(2, 'Brian Otieno', 'brian@example.com'),
(3, 'Carol Achieng', 'carol@example.com'),
(4, 'David Kamau', 'david@example.com');

INSERT INTO courses (course_id, course_name) VALUES
(1, 'Database Systems'),
(2, 'Web Development'),
(3, 'Geographic Information Systems');

INSERT INTO enrolments (enrolment_id, student_id, course_id, grade) VALUES
(1, 1, 1, 'A'),
(2, 1, 2, 'B'),
(3, 2, 1, 'B'),
(4, 2, 3, 'A'),
(5, 3, 2, 'A');


-- 3. FIVE REQUIRED QUERIES


-- Query 1: All courses for one student, by name
SELECT students.name, courses.course_name
FROM students
JOIN enrolments ON students.student_id = enrolments.student_id
JOIN courses ON enrolments.course_id = courses.course_id
WHERE students.name = 'Alice Wanjiku';


-- Query 2: All students on one course
SELECT courses.course_name, students.name
FROM courses
JOIN enrolments ON courses.course_id = enrolments.course_id
JOIN students ON enrolments.student_id = students.student_id
WHERE courses.course_name = 'Database Systems';


-- Query 3: Number of students per course
SELECT courses.course_name, COUNT(enrolments.student_id) AS number_of_students
FROM courses
LEFT JOIN enrolments ON courses.course_id = enrolments.course_id
GROUP BY courses.course_id, courses.course_name;


-- Query 4: Students who have no enrolments
SELECT students.name
FROM students
LEFT JOIN enrolments ON students.student_id = enrolments.student_id
WHERE enrolments.student_id IS NULL;


-- Query 5: Update one enrolment's grade
UPDATE enrolments
SET grade = 'A+'
WHERE enrolment_id = 2;