export interface DemoSample {
  name: string
  language: string
  code: string
  description: string
}

export const demoSamples: DemoSample[] = [
  {
    name: 'Python Class',
    language: 'python',
    description: 'A User authentication class with login and registration',
    code: `class UserAuth:
    """User authentication manager."""

    def __init__(self, db_connection):
        self.db = db_connection
        self.sessions = {}

    def register(self, username, password, email):
        """Register a new user account.

        Args:
            username (str): Unique username for the account
            password (str): User's password (will be hashed)
            email (str): User's email address

        Returns:
            dict: User object with id, username, and email

        Raises:
            ValueError: If username already exists
        """
        if self.db.user_exists(username):
            raise ValueError(f"Username '{username}' already exists")

        hashed_pwd = self._hash_password(password)
        user_id = self.db.create_user(username, hashed_pwd, email)

        return {
            'id': user_id,
            'username': username,
            'email': email
        }

    def login(self, username, password):
        """Authenticate user and create session.

        Args:
            username (str): Username to authenticate
            password (str): Password to verify

        Returns:
            str: Session token for authenticated user

        Raises:
            AuthenticationError: If credentials are invalid
        """
        user = self.db.get_user(username)
        if not user or not self._verify_password(password, user['password']):
            raise AuthenticationError("Invalid username or password")

        session_token = self._generate_token()
        self.sessions[session_token] = user['id']

        return session_token

    def _hash_password(self, password):
        """Hash password using bcrypt."""
        import bcrypt
        return bcrypt.hashpw(password.encode(), bcrypt.gensalt())

    def _verify_password(self, password, hashed):
        """Verify password against hash."""
        import bcrypt
        return bcrypt.checkpw(password.encode(), hashed)

    def _generate_token(self):
        """Generate secure session token."""
        import secrets
        return secrets.token_urlsafe(32)
`
  },
  {
    name: 'JavaScript Function',
    language: 'javascript',
    description: 'An async data fetcher with retry logic and caching',
    code: `/**
 * Fetches data from an API with automatic retry and caching
 */
class DataFetcher {
  constructor(baseUrl, options = {}) {
    this.baseUrl = baseUrl;
    this.cache = new Map();
    this.maxRetries = options.maxRetries || 3;
    this.timeout = options.timeout || 5000;
    this.cacheDuration = options.cacheDuration || 60000; // 1 minute
  }

  async fetch(endpoint, options = {}) {
    const cacheKey = this._getCacheKey(endpoint, options);

    // Check cache first
    if (this._isCacheValid(cacheKey)) {
      console.log('Returning cached data for:', endpoint);
      return this.cache.get(cacheKey).data;
    }

    // Fetch with retry logic
    let lastError;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const data = await this._makeRequest(endpoint, options);
        this._updateCache(cacheKey, data);
        return data;
      } catch (error) {
        lastError = error;
        console.warn(\`Attempt \${attempt + 1} failed:\`, error.message);

        if (attempt < this.maxRetries - 1) {
          await this._delay(Math.pow(2, attempt) * 1000); // Exponential backoff
        }
      }
    }

    throw new Error(\`Failed after \${this.maxRetries} attempts: \${lastError.message}\`);
  }

  async _makeRequest(endpoint, options) {
    const url = \`\${this.baseUrl}\${endpoint}\`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
      }

      return await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  _getCacheKey(endpoint, options) {
    return \`\${endpoint}-\${JSON.stringify(options)}\`;
  }

  _isCacheValid(key) {
    const cached = this.cache.get(key);
    if (!cached) return false;
    return Date.now() - cached.timestamp < this.cacheDuration;
  }

  _updateCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  clearCache() {
    this.cache.clear();
  }
}

export default DataFetcher;
`
  },
  {
    name: 'Java Method',
    language: 'java',
    description: 'A binary search tree implementation with insert and search',
    code: `public class BinarySearchTree<T extends Comparable<T>> {
    private Node<T> root;
    private int size;

    private static class Node<T> {
        T data;
        Node<T> left;
        Node<T> right;

        Node(T data) {
            this.data = data;
            this.left = null;
            this.right = null;
        }
    }

    public BinarySearchTree() {
        this.root = null;
        this.size = 0;
    }

    /**
     * Inserts a new value into the binary search tree.
     *
     * @param value the value to insert
     * @return true if the value was inserted, false if it already exists
     */
    public boolean insert(T value) {
        if (value == null) {
            throw new IllegalArgumentException("Cannot insert null value");
        }

        int initialSize = size;
        root = insertRecursive(root, value);
        return size > initialSize;
    }

    private Node<T> insertRecursive(Node<T> node, T value) {
        if (node == null) {
            size++;
            return new Node<>(value);
        }

        int comparison = value.compareTo(node.data);
        if (comparison < 0) {
            node.left = insertRecursive(node.left, value);
        } else if (comparison > 0) {
            node.right = insertRecursive(node.right, value);
        }
        // If equal, don't insert duplicate

        return node;
    }

    /**
     * Searches for a value in the tree.
     *
     * @param value the value to search for
     * @return true if the value exists in the tree, false otherwise
     */
    public boolean search(T value) {
        if (value == null) {
            return false;
        }
        return searchRecursive(root, value);
    }

    private boolean searchRecursive(Node<T> node, T value) {
        if (node == null) {
            return false;
        }

        int comparison = value.compareTo(node.data);
        if (comparison == 0) {
            return true;
        } else if (comparison < 0) {
            return searchRecursive(node.left, value);
        } else {
            return searchRecursive(node.right, value);
        }
    }

    /**
     * Returns the number of elements in the tree.
     *
     * @return the size of the tree
     */
    public int size() {
        return size;
    }

    /**
     * Checks if the tree is empty.
     *
     * @return true if the tree contains no elements
     */
    public boolean isEmpty() {
        return size == 0;
    }

    /**
     * Finds the minimum value in the tree.
     *
     * @return the minimum value, or null if tree is empty
     */
    public T findMin() {
        if (root == null) {
            return null;
        }
        Node<T> current = root;
        while (current.left != null) {
            current = current.left;
        }
        return current.data;
    }

    /**
     * Finds the maximum value in the tree.
     *
     * @return the maximum value, or null if tree is empty
     */
    public T findMax() {
        if (root == null) {
            return null;
        }
        Node<T> current = root;
        while (current.right != null) {
            current = current.right;
        }
        return current.data;
    }
}
`
  },
  {
    name: 'TypeScript Interface',
    language: 'typescript',
    description: 'A REST API service with type-safe endpoints',
    code: `interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
  timestamp: Date;
}

interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
  };
}

interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  params?: Record<string, string | number>;
  body?: any;
  timeout?: number;
}

class ApiService {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Set authentication token for all requests
   */
  setAuthToken(token: string): void {
    this.defaultHeaders['Authorization'] = \`Bearer \${token}\`;
  }

  /**
   * Generic GET request with type safety
   */
  async get<T>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  /**
   * Generic POST request with type safety
   */
  async post<T>(endpoint: string, body: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'POST', body });
  }

  /**
   * Generic PUT request with type safety
   */
  async put<T>(endpoint: string, body: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PUT', body });
  }

  /**
   * Generic DELETE request with type safety
   */
  async delete<T>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }

  /**
   * Paginated GET request
   */
  async getPaginated<T>(
    endpoint: string,
    page: number = 1,
    pageSize: number = 10,
    config?: RequestConfig
  ): Promise<PaginatedResponse<T>> {
    const params = {
      page: page.toString(),
      pageSize: pageSize.toString(),
      ...config?.params,
    };

    return this.request<T[]>(endpoint, { ...config, method: 'GET', params }) as Promise<PaginatedResponse<T>>;
  }

  /**
   * Core request method with error handling and timeout
   */
  private async request<T>(endpoint: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      params = {},
      body,
      timeout = 30000,
    } = config;

    const url = new URL(\`\${this.baseUrl}\${endpoint}\`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url.toString(), {
        method,
        headers: { ...this.defaultHeaders, ...headers },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || \`HTTP \${response.status}\`);
      }

      return {
        data: data.data || data,
        status: response.status,
        message: data.message || 'Success',
        timestamp: new Date(),
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(\`API request failed: \${error.message}\`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export default ApiService;
`
  },
  {
    name: 'GraphQL Schema',
    language: 'graphql',
    description: 'A complete e-commerce GraphQL API schema with types, queries, and mutations',
    code: `directive @cacheControl(
  maxAge: Int
  scope: CacheControlScope
) on FIELD_DEFINITION | OBJECT

directive @auth(
  requires: UserRole
) on FIELD_DEFINITION | OBJECT

enum CacheControlScope {
  PUBLIC
  PRIVATE
}

type Query {
  "Get a single product by ID"
  product(id: ID!): Product

  "Get all products with optional filtering"
  products(category: String, minPrice: Float, maxPrice: Float, limit: Int = 10, offset: Int = 0): [Product!]!

  "Search products by name or description"
  searchProducts(query: String!, limit: Int = 20): [Product!]!

  "Get current user's profile"
  me: User

  "Get user by ID (admin only)"
  user(id: ID!): User

  "Get all orders for the current user"
  myOrders(limit: Int = 10, offset: Int = 0): [Order!]!

  "Get order by ID"
  order(id: ID!): Order
}

type Mutation {
  "Create a new user account"
  signup(input: SignupInput!): AuthPayload!

  "Login with credentials"
  login(email: String!, password: String!): AuthPayload!

  "Add a product to cart"
  addToCart(productId: ID!, quantity: Int!): Cart!

  "Remove product from cart"
  removeFromCart(productId: ID!): Cart!

  "Update cart item quantity"
  updateCartQuantity(productId: ID!, quantity: Int!): Cart!

  "Create an order from cart"
  createOrder(input: CreateOrderInput!): Order!

  "Cancel an order"
  cancelOrder(orderId: ID!): Order!

  "Update user profile"
  updateProfile(input: UpdateProfileInput!): User!
}

type Subscription {
  "Subscribe to order status updates"
  orderStatusChanged(orderId: ID!): Order!

  "Subscribe to product price changes"
  productPriceChanged(productId: ID!): Product!
}

"""
Product available for purchase
"""
type Product {
  id: ID!
  name: String!
  description: String
  price: Float!
  category: ProductCategory!
  stock: Int!
  images: [String!]!
  reviews: [Review!]!
  averageRating: Float
  createdAt: DateTime!
  updatedAt: DateTime!
}

"""
Product categories
"""
enum ProductCategory {
  ELECTRONICS
  CLOTHING
  BOOKS
  HOME
  SPORTS
  TOYS
  OTHER
}

"""
Customer review for a product
"""
type Review {
  id: ID!
  product: Product!
  user: User!
  rating: Int!
  comment: String
  createdAt: DateTime!
}

"""
User account
"""
type User {
  id: ID!
  email: String!
  name: String!
  avatar: String
  role: UserRole!
  cart: Cart
  orders: [Order!]!
  reviews: [Review!]!
  createdAt: DateTime!
}

"""
User roles for authorization
"""
enum UserRole {
  CUSTOMER
  ADMIN
  SELLER
}

"""
Shopping cart
"""
type Cart {
  id: ID!
  user: User!
  items: [CartItem!]!
  totalPrice: Float!
  itemCount: Int!
}

"""
Item in shopping cart
"""
type CartItem {
  id: ID!
  product: Product!
  quantity: Int!
  subtotal: Float!
}

"""
Order placed by user
"""
type Order {
  id: ID!
  user: User!
  items: [OrderItem!]!
  status: OrderStatus!
  totalPrice: Float!
  shippingAddress: Address!
  paymentMethod: PaymentMethod!
  createdAt: DateTime!
  updatedAt: DateTime!
}

"""
Item in an order
"""
type OrderItem {
  id: ID!
  product: Product!
  quantity: Int!
  priceAtTime: Float!
  subtotal: Float!
}

"""
Order status tracking
"""
enum OrderStatus {
  PENDING
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
}

"""
Shipping address
"""
type Address {
  street: String!
  city: String!
  state: String!
  zipCode: String!
  country: String!
}

"""
Payment method
"""
enum PaymentMethod {
  CREDIT_CARD
  DEBIT_CARD
  PAYPAL
  CRYPTO
}

"""
Authentication payload
"""
type AuthPayload {
  token: String!
  user: User!
  expiresIn: Int!
}

"""
Input for user signup
"""
input SignupInput {
  email: String!
  password: String!
  name: String!
}

"""
Input for creating an order
"""
input CreateOrderInput {
  shippingAddress: AddressInput!
  paymentMethod: PaymentMethod!
}

"""
Input for shipping address
"""
input AddressInput {
  street: String!
  city: String!
  state: String!
  zipCode: String!
  country: String!
}

"""
Input for updating user profile
"""
input UpdateProfileInput {
  name: String
  avatar: String
}

"""
Custom scalar for DateTime
"""
scalar DateTime
`
  }
];
