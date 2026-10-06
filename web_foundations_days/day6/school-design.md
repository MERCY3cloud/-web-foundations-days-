# School Database Design

## Students

The students table stores information about each student. It contains a unique student ID, the student's name, and their email address. The student ID is the primary key, while the email address is unique so that two students cannot have the same email.

## Courses

The courses table stores information about the courses offered by the school. Each course has a unique course ID and a course name. The course ID is the primary key.

## Enrolments

The enrolments table records which students are enrolled in which courses. It contains the student ID, course ID, and the student's grade for that course. It also has its own primary key called enrolment_id.

## Relationships

There is a one-to-many relationship between students and enrolments because one student can have many enrolments, while each enrolment belongs to one student. There is also a one-to-many relationship between courses and enrolments because one course can have many enrolments, while each enrolment belongs to one course.

Students and courses have a many-to-many relationship because one student can take many courses and one course can have many students. The enrolments table is needed as a join table to represent this many-to-many relationship. It also allows us to store additional information about the relationship, such as the student's grade.

## Index

I would add an index on `enrolments.student_id` because queries frequently search for all courses taken by a particular student. An index can make these searches faster as the database becomes larger.

## SQL or NoSQL?

I would choose SQL for this school system because the data has clear relationships between students, courses, and enrolments. SQL databases are well suited to structured data and allow us to use primary keys, foreign keys, unique constraints, joins, and transactions. The relationships in this system are important, so a relational SQL database would be a good choice.