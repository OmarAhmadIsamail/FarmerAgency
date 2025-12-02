<?php
// api/index.php - Main API router
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once __DIR__ . '/../config/env.php';
require_once __DIR__ . '/../config/database.php';

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Parse request
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$apiBase = '/farmconnect/api';

// Remove API base from URI
$endpoint = str_replace($apiBase, '', $requestUri);

// Route to appropriate handler
$routes = [
    'GET' => [
        '/users/(\d+)' => 'getUser',
        '/products' => 'getProducts',
        '/products/(\d+)' => 'getProduct',
        '/farms' => 'getFarms',
        '/farms/(\d+)' => 'getFarm',
        '/orders/(\d+)' => 'getOrder',
        '/blog' => 'getBlogPosts',
        '/blog/(\d+)' => 'getBlogPost',
    ],
    'POST' => [
        '/auth/login' => 'login',
        '/auth/register' => 'register',
        '/auth/logout' => 'logout',
        '/products' => 'createProduct',
        '/orders' => 'createOrder',
        '/blog' => 'createBlogPost',
        '/comments' => 'createComment',
    ],
    'PUT' => [
        '/products/(\d+)' => 'updateProduct',
        '/orders/(\d+)' => 'updateOrder',
        '/profile/(\d+)' => 'updateProfile',
    ],
    'DELETE' => [
        '/products/(\d+)' => 'deleteProduct',
        '/comments/(\d+)' => 'deleteComment',
    ]
];

// Find matching route
$matched = false;
foreach ($routes[$requestMethod] as $pattern => $handler) {
    if (preg_match('#^' . $pattern . '$#', $endpoint, $matches)) {
        $matched = true;
        require_once __DIR__ . '/handlers/' . $handler . '.php';
        break;
    }
}

if (!$matched) {
    http_response_code(404);
    echo json_encode(['error' => 'Endpoint not found']);
}
?>