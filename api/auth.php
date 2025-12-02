<?php
// api/auth.php - Authentication API endpoint
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Include database configuration
require_once __DIR__ . '/../config/env.php';
require_once __DIR__ . '/../config/database.php';

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Get request method
$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($method) {
    case 'POST':
        if ($action === 'login') {
            handleLogin();
        } elseif ($action === 'register') {
            handleRegister();
        } elseif ($action === 'logout') {
            handleLogout();
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Action not found']);
        }
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        break;
}

function handleLogin() {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['email']) || !isset($data['password'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Email and password are required']);
        return;
    }
    
    $email = filter_var($data['email'], FILTER_SANITIZE_EMAIL);
    $password = $data['password'];
    
    $db = new Database();
    $conn = $db->connect();
    
    if (!$conn) {
        http_response_code(500);
        echo json_encode(['error' => 'Database connection failed']);
        return;
    }
    
    // Prepare statement
    $stmt = $conn->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid email or password']);
        $conn->close();
        return;
    }
    
    $user = $result->fetch_assoc();
    
    // Verify password
    if (!password_verify($password, $user['password_hash'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid email or password']);
        $conn->close();
        return;
    }
    
    // Check if user is active
    if (!$user['is_active']) {
        http_response_code(403);
        echo json_encode(['error' => 'Account is deactivated']);
        $conn->close();
        return;
    }
    
    // Create session token
    $session_token = bin2hex(random_bytes(32));
    
    // Don't return password hash
    unset($user['password_hash']);
    
    $conn->close();
    
    echo json_encode([
        'success' => true,
        'message' => 'Login successful',
        'user' => $user,
        'session_token' => $session_token
    ]);
}

function handleRegister() {
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validate required fields
    $required = ['firstName', 'lastName', 'email', 'password', 'confirmPassword'];
    foreach ($required as $field) {
        if (!isset($data[$field]) || empty(trim($data[$field]))) {
            http_response_code(400);
            echo json_encode(['error' => ucfirst($field) . ' is required']);
            return;
        }
    }
    
    // Validate email
    if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid email format']);
        return;
    }
    
    // Validate password strength
    if (strlen($data['password']) < 8) {
        http_response_code(400);
        echo json_encode(['error' => 'Password must be at least 8 characters long']);
        return;
    }
    
    // Check password confirmation
    if ($data['password'] !== $data['confirmPassword']) {
        http_response_code(400);
        echo json_encode(['error' => 'Passwords do not match']);
        return;
    }
    
    // Check if terms accepted
    if (!isset($data['terms']) || !$data['terms']) {
        http_response_code(400);
        echo json_encode(['error' => 'You must accept the terms and conditions']);
        return;
    }
    
    $firstName = htmlspecialchars($data['firstName']);
    $lastName = htmlspecialchars($data['lastName']);
    $email = filter_var($data['email'], FILTER_SANITIZE_EMAIL);
    $password = $data['password'];
    
    $db = new Database();
    $conn = $db->connect();
    
    if (!$conn) {
        http_response_code(500);
        echo json_encode(['error' => 'Database connection failed']);
        return;
    }
    
    // Check if email already exists
    $checkStmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
    $checkStmt->bind_param("s", $email);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    
    if ($checkResult->num_rows > 0) {
        http_response_code(409);
        echo json_encode(['error' => 'Email already registered']);
        $conn->close();
        return;
    }
    
    // Create username from email
    $username = strtolower($firstName . $lastName . substr($email, 0, strpos($email, '@')));
    $username = preg_replace('/[^a-zA-Z0-9]/', '', $username);
    
    // Check if username already exists
    $usernameCheck = $conn->prepare("SELECT id FROM users WHERE username = ?");
    $usernameCheck->bind_param("s", $username);
    $usernameCheck->execute();
    if ($usernameCheck->get_result()->num_rows > 0) {
        $username .= rand(100, 999);
    }
    
    // Hash password
    $password_hash = password_hash($password, PASSWORD_DEFAULT);
    $full_name = $firstName . ' ' . $lastName;
    
    // Insert new user
    $stmt = $conn->prepare("INSERT INTO users (username, email, password_hash, full_name, user_type) VALUES (?, ?, ?, ?, 'customer')");
    $stmt->bind_param("ssss", $username, $email, $password_hash, $full_name);
    
    if ($stmt->execute()) {
        $userId = $conn->insert_id;
        
        // Get the created user (without password)
        $getUserStmt = $conn->prepare("SELECT id, username, email, full_name, user_type, created_at FROM users WHERE id = ?");
        $getUserStmt->bind_param("i", $userId);
        $getUserStmt->execute();
        $user = $getUserStmt->get_result()->fetch_assoc();
        
        // Create session token
        $session_token = bin2hex(random_bytes(32));
        
        $conn->close();
        
        echo json_encode([
            'success' => true,
            'message' => 'Registration successful',
            'user' => $user,
            'session_token' => $session_token
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Registration failed: ' . $conn->error]);
        $conn->close();
    }
}

function handleLogout() {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['session_token'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Session token required']);
        return;
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Logged out successfully'
    ]);
}
?>