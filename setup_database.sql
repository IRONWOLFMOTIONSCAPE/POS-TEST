CREATE DATABASE IF NOT EXISTS POS;
USE POS;

CREATE TABLE IF NOT EXISTS sales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    total DECIMAL(10,2) NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sale_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id INT,
    product_id INT,
    product_name VARCHAR(255),
    price DECIMAL(10,2),
    FOREIGN KEY (sale_id) REFERENCES sales(id)
);
