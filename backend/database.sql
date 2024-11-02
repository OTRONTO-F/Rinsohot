CREATE DATABASE dating_app;
USE dating_app;

CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    birth_date DATE NOT NULL,
    gender ENUM('male', 'female', 'other') NOT NULL,
    bio TEXT,
    profile_picture VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE matches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user1_id INT,
    user2_id INT,
    status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user1_id) REFERENCES users(id),
    FOREIGN KEY (user2_id) REFERENCES users(id)
);

-- ตารางสำหรับข้อมูลความสนใจ
CREATE TABLE user_preferences (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    interested_in ENUM('male', 'female', 'both') NOT NULL,
    min_age INT NOT NULL,
    max_age INT NOT NULL,
    location VARCHAR(100),
    max_distance INT, -- ระยะทางในกิโลเมตร
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ตารางสำหรับความสนใจและงานอดิเรก
CREATE TABLE interests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- ตารางเชื่อมระหว่างผู้ใช้และความสนใจ
CREATE TABLE user_interests (
    user_id INT,
    interest_id INT,
    PRIMARY KEY (user_id, interest_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (interest_id) REFERENCES interests(id)
);

-- เพิ่มข้อมูลตัวอย่างในตาราง interests
INSERT INTO interests (name) VALUES 
('Reading'),
('Traveling'),
('Music'),
('Movies'),
('Sports'),
('Cooking'),
('Photography'),
('Art'),
('Gaming'),
('Fitness'),
('Dancing'),
('Hiking'),
('Technology'),
('Fashion'),
('Food'); 