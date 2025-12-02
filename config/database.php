<?php
// database.php - Database connection class
class Database {
    private $host;
    private $username;
    private $password;
    private $database;
    private $conn;

    public function __construct() {
        // Load environment variables (we'll create .env file next)
        $this->host = getenv('DB_HOST') ?: 'localhost';
        $this->username = getenv('DB_USERNAME') ?: 'root';
        $this->password = getenv('DB_PASSWORD') ?: '';
        $this->database = getenv('DB_NAME') ?: 'farmconnect_db';
    }

    public function connect() {
        try {
            $this->conn = new mysqli($this->host, $this->username, $this->password, $this->database);
            
            if ($this->conn->connect_error) {
                throw new Exception("Connection failed: " . $this->conn->connect_error);
            }
            
            // Set charset to UTF-8
            $this->conn->set_charset("utf8mb4");
            
            return $this->conn;
        } catch (Exception $e) {
            error_log("Database connection error: " . $e->getMessage());
            return null;
        }
    }

    public function close() {
        if ($this->conn) {
            $this->conn->close();
        }
    }

    // Helper method for prepared statements
    public function query($sql, $params = []) {
        $conn = $this->connect();
        if (!$conn) return false;

        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            error_log("Prepare failed: " . $conn->error);
            return false;
        }

        if (!empty($params)) {
            $types = str_repeat('s', count($params)); // All params as strings
            $stmt->bind_param($types, ...$params);
        }

        $result = $stmt->execute();
        
        if (strpos(strtoupper($sql), 'SELECT') === 0) {
            $result = $stmt->get_result();
            $data = [];
            while ($row = $result->fetch_assoc()) {
                $data[] = $row;
            }
            $stmt->close();
            $conn->close();
            return $data;
        } else {
            $affectedRows = $stmt->affected_rows;
            $stmt->close();
            $conn->close();
            return $affectedRows;
        }
    }
}

// Global database instance
function getDB() {
    static $db = null;
    if ($db === null) {
        $db = new Database();
    }
    return $db;
}
?>