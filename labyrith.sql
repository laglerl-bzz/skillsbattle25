-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS labyrinth;

-- Use the labyrinth database
USE labyrinth;

-- Create the labyrinths table
CREATE TABLE IF NOT EXISTS labyrinths (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    data TEXT NOT NULL,
    size VARCHAR(10) NOT NULL,
    difficulty INT NOT NULL,
    remarks TEXT,
    solution_length INT,
    creator_name VARCHAR(50) NOT NULL,
    creation_date DATETIME NOT NULL
);
