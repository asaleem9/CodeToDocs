// Sample code snippets for testing CodeToDocsAI

export const samples = {
  javascript: {
    name: "Shopping Cart Class",
    language: "javascript",
    code: `class ShoppingCart {
  constructor() {
    this.items = [];
    this.discounts = new Map();
  }

  addItem(product, quantity = 1) {
    const existingItem = this.items.find(item => item.product.id === product.id);

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      this.items.push({ product, quantity });
    }

    return this.getTotal();
  }

  removeItem(productId) {
    this.items = this.items.filter(item => item.product.id !== productId);
    return this.getTotal();
  }

  applyDiscount(code, percentage) {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Discount percentage must be between 0 and 100');
    }
    this.discounts.set(code, percentage / 100);
  }

  getSubtotal() {
    return this.items.reduce((sum, item) =>
      sum + (item.product.price * item.quantity), 0
    );
  }

  getTotal() {
    let total = this.getSubtotal();

    for (const [code, discount] of this.discounts) {
      total -= total * discount;
    }

    return Math.round(total * 100) / 100;
  }

  getItemCount() {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  clear() {
    this.items = [];
    this.discounts.clear();
  }
}`
  },

  python: {
    name: "Binary Search Tree",
    language: "python",
    code: `class TreeNode:
    def __init__(self, value):
        self.value = value
        self.left = None
        self.right = None

class BinarySearchTree:
    def __init__(self):
        self.root = None
        self.size = 0

    def insert(self, value):
        """
        Insert a new value into the BST.
        Maintains the BST property: left < parent < right.
        """
        if self.root is None:
            self.root = TreeNode(value)
            self.size += 1
            return True

        return self._insert_recursive(self.root, value)

    def _insert_recursive(self, node, value):
        if value == node.value:
            return False  # Duplicate values not allowed

        if value < node.value:
            if node.left is None:
                node.left = TreeNode(value)
                self.size += 1
                return True
            return self._insert_recursive(node.left, value)
        else:
            if node.right is None:
                node.right = TreeNode(value)
                self.size += 1
                return True
            return self._insert_recursive(node.right, value)

    def search(self, value):
        """
        Search for a value in the BST.
        Returns True if found, False otherwise.
        """
        return self._search_recursive(self.root, value)

    def _search_recursive(self, node, value):
        if node is None:
            return False

        if value == node.value:
            return True
        elif value < node.value:
            return self._search_recursive(node.left, value)
        else:
            return self._search_recursive(node.right, value)

    def inorder_traversal(self):
        """
        Perform inorder traversal (left, root, right).
        Returns a sorted list of values.
        """
        result = []
        self._inorder_recursive(self.root, result)
        return result

    def _inorder_recursive(self, node, result):
        if node:
            self._inorder_recursive(node.left, result)
            result.append(node.value)
            self._inorder_recursive(node.right, result)

    def get_height(self):
        """Calculate the height of the tree."""
        return self._height_recursive(self.root)

    def _height_recursive(self, node):
        if node is None:
            return 0
        return 1 + max(
            self._height_recursive(node.left),
            self._height_recursive(node.right)
        )`
  },

  typescript: {
    name: "API Client with Retry Logic",
    language: "typescript",
    code: `interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

interface RetryConfig {
  maxRetries: number;
  backoffMultiplier: number;
  initialDelayMs: number;
}

class APIClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private retryConfig: RetryConfig;

  constructor(
    baseURL: string,
    defaultHeaders: Record<string, string> = {},
    retryConfig: RetryConfig = {
      maxRetries: 3,
      backoffMultiplier: 2,
      initialDelayMs: 1000
    }
  ) {
    this.baseURL = baseURL;
    this.defaultHeaders = defaultHeaders;
    this.retryConfig = retryConfig;
  }

  async request<T>(endpoint: string, config: RequestConfig): Promise<T> {
    const url = \`\${this.baseURL}\${endpoint}\`;
    const headers = { ...this.defaultHeaders, ...config.headers };

    let lastError: Error;
    let delay = this.retryConfig.initialDelayMs;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = config.timeout
          ? setTimeout(() => controller.abort(), config.timeout)
          : null;

        const response = await fetch(url, {
          method: config.method,
          headers,
          body: config.body ? JSON.stringify(config.body) : undefined,
          signal: controller.signal
        });

        if (timeoutId) clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
        }

        return await response.json();
      } catch (error) {
        lastError = error as Error;

        if (attempt < this.retryConfig.maxRetries) {
          console.warn(\`Request failed (attempt \${attempt + 1}), retrying in \${delay}ms...\`);
          await this.sleep(delay);
          delay *= this.retryConfig.backoffMultiplier;
        }
      }
    }

    throw new Error(\`Request failed after \${this.retryConfig.maxRetries} retries: \${lastError!.message}\`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async get<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', headers });
  }

  async post<T>(endpoint: string, body: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body, headers });
  }
}`
  },

  java: {
    name: "User Authentication Service",
    language: "java",
    code: `import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

public class UserAuthenticationService {
    private Map<String, User> users;
    private Map<String, String> activeSessions;
    private int maxLoginAttempts;
    private long sessionTimeoutMs;

    public UserAuthenticationService(int maxLoginAttempts, long sessionTimeoutMs) {
        this.users = new HashMap<>();
        this.activeSessions = new HashMap<>();
        this.maxLoginAttempts = maxLoginAttempts;
        this.sessionTimeoutMs = sessionTimeoutMs;
    }

    public boolean registerUser(String username, String email, String password)
            throws IllegalArgumentException {
        if (username == null || username.isEmpty()) {
            throw new IllegalArgumentException("Username cannot be empty");
        }

        if (users.containsKey(username)) {
            return false;
        }

        String hashedPassword = hashPassword(password);
        User newUser = new User(username, email, hashedPassword);
        users.put(username, newUser);
        return true;
    }

    public String login(String username, String password)
            throws AuthenticationException {
        User user = users.get(username);

        if (user == null) {
            throw new AuthenticationException("User not found");
        }

        if (user.isLocked()) {
            throw new AuthenticationException("Account locked due to too many failed attempts");
        }

        String hashedPassword = hashPassword(password);

        if (!user.getPasswordHash().equals(hashedPassword)) {
            user.incrementFailedAttempts();

            if (user.getFailedAttempts() >= maxLoginAttempts) {
                user.setLocked(true);
            }

            throw new AuthenticationException("Invalid credentials");
        }

        user.resetFailedAttempts();
        String sessionToken = UUID.randomUUID().toString();
        activeSessions.put(sessionToken, username);

        return sessionToken;
    }

    public boolean validateSession(String sessionToken) {
        return activeSessions.containsKey(sessionToken);
    }

    public void logout(String sessionToken) {
        activeSessions.remove(sessionToken);
    }

    private String hashPassword(String password) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(password.getBytes());
            StringBuilder hexString = new StringBuilder();

            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }

            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }
}

class User {
    private String username;
    private String email;
    private String passwordHash;
    private int failedAttempts;
    private boolean locked;

    public User(String username, String email, String passwordHash) {
        this.username = username;
        this.email = email;
        this.passwordHash = passwordHash;
        this.failedAttempts = 0;
        this.locked = false;
    }

    // Getters and setters
    public String getPasswordHash() { return passwordHash; }
    public int getFailedAttempts() { return failedAttempts; }
    public boolean isLocked() { return locked; }
    public void setLocked(boolean locked) { this.locked = locked; }

    public void incrementFailedAttempts() { this.failedAttempts++; }
    public void resetFailedAttempts() { this.failedAttempts = 0; }
}

class AuthenticationException extends Exception {
    public AuthenticationException(String message) {
        super(message);
    }
}`
  }
};

export const webhookPayload = {
  action: "closed",
  number: 42,
  pull_request: {
    merged: true,
    number: 42,
    title: "Add user authentication feature",
    user: {
      login: "developer123"
    },
    head: {
      ref: "feature/user-auth"
    },
    base: {
      repo: {
        name: "awesome-app",
        full_name: "company/awesome-app"
      }
    }
  }
};
