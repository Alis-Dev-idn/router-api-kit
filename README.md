# @alisdev/router-api-kit

A decorator-based controller library for Node.js APIs. Supports **Express** and **Fastify**, includes **Zod-based request validation**, structured **exception handling**, optional **Swagger UI** generation, and **cookie management**.

## Installation

```bash
npm install @alisdev/router-api-kit reflect-metadata zod
```

> **Note:** You also need one of the supported frameworks:
> ```bash
> npm install express          # for Express
> npm install fastify          # for Fastify
> ```

## Requirements

Enable decorators in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strict": true
  }
}
```

Import `reflect-metadata` at the top of your entry file:

```typescript
import "reflect-metadata";
```

---

## Quick Start

```typescript
import "reflect-metadata";
import express from "express";
import { RouterKit, ReqController, GetMapping, PostMapping } from "@alisdev/router-api-kit";

@ReqController("/hello")
class HelloController {
  @GetMapping("/")
  async sayHello() {
    return { greeting: "Hello, World!" };
  }
}

const app = express();
app.use(express.json());

RouterKit.setup({
  framework: "express",
  app,
  swagger: { enabled: true, path: "/api/docs" },
});

RouterKit.register(HelloController);

app.listen(3000, () => console.log("Server running on port 3000"));
```

---

## API Reference

### `RouterKit`

Central setup class. Configured once at application entry point.

```typescript
RouterKit.setup(config: RouterKitConfig): void
RouterKit.register(...controllers: Class[]): void
```

**Configuration:**

```typescript
interface RouterKitConfig {
  framework: "express" | "fastify";
  app: express.Application | FastifyInstance;
  authMiddleware?: MiddlewareFn;       // for authentication: "auth"
  refreshMiddleware?: MiddlewareFn;    // for authentication: "refresh"
  swagger?: {
    enabled: boolean;
    path?: string;            // default: "/api/docs"
    title?: string;           // default: "API Documentation"
    version?: string;         // default: "1.0.0"
    sortBy?: "path" | "method";
    searchByPath?: boolean;
    searchByMethod?: boolean;
    searchByTag?: boolean;
  };
}
```

### `@ReqController(basePath, options?)`

Marks a class as a route controller with a base path and default authentication.

```typescript
@ReqController("/users", { authentication: "auth", tag: "User Management" })
class UserController { ... }
```

**Options:**
| Option | Type | Default | Description |
|---|---|---|---|
| `authentication` | `"auth" \| "refresh" \| false` | `false` | Default auth for all routes |
| `tag` | `string` | Derived from class name | Swagger tag |
| `swagger` | `boolean` | `true` | Include in Swagger docs |

### Method Mapping Decorators

```typescript
@GetMapping(path, options?)
@PostMapping(path, options?)
@PutMapping(path, options?)
@PatchMapping(path, options?)
@DeleteMapping(path, options?)
```

**Options:**
| Option | Type | Description |
|---|---|---|
| `authentication` | `"auth" \| "refresh" \| false` | Override controller-level auth |
| `swagger` | `boolean` | Include in Swagger docs |
| `tag` | `string` | Override controller tag |
| `summary` | `string` | Swagger summary |
| `description` | `string` | Swagger description |
| `status` | `number` | Default response status code |

### Parameter Decorators

| Decorator | Description |
|---|---|
| `@Body(schema?)` | Injects and validates `req.body` with Zod |
| `@Query(schema?)` | Injects and validates `req.query` with Zod |
| `@Param(key)` | Injects a single route parameter |
| `@Req()` | Injects the raw request object |
| `@Cookie()` | Injects a `CookieSetter` instance |

### Method Decorators

| Decorator | Description |
|---|---|
| `@UseMiddleware(...fns)` | Applies middleware to a route |
| `@HttpStatus(code)` | Sets default response status code |

### Exceptions

All exceptions extend `BaseException` and auto-send the appropriate HTTP response.

| Exception | Status | Code |
|---|---|---|
| `BadRequestException` | 400 | `BAD_REQUEST` |
| `UnauthorizedException` | 401 | `UNAUTHORIZED` |
| `ForbiddenException` | 403 | `FORBIDDEN` |
| `NotFoundException` | 404 | `NOT_FOUND` |
| `ConflictException` | 409 | `CONFLICT` |
| `ServerErrorException` | 500 | `INTERNAL_SERVER_ERROR` |

### `CookieSetter`

Injected via `@Cookie()`. Abstracts cookie operations across frameworks.

```typescript
cookie.set(key, value, options?)   // Set a cookie
cookie.get(key)                    // Get a cookie value
cookie.delete(key)                 // Delete a cookie
```

---

## Full Usage Example

```typescript
import "reflect-metadata";
import express from "express";
import { z } from "zod";
import {
  RouterKit,
  ReqController,
  GetMapping, PostMapping, PutMapping, DeleteMapping,
  Body, Query, Param, Req, Cookie,
  UseMiddleware, HttpStatus,
  BadRequestException, NotFoundException, ConflictException,
  CookieSetter,
} from "@alisdev/router-api-kit";

// ── Zod Schemas ───────────────────────────────────────────────────

const CreateUserSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  age: z.coerce.number().min(1),
});

const UserQuerySchema = z.object({
  page: z.coerce.number().default(1),
  size: z.coerce.number().default(10),
  search: z.string().optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type ICreateUser = z.infer<typeof CreateUserSchema>;
type IUserQuery = z.infer<typeof UserQuerySchema>;
type ILoginBody = z.infer<typeof LoginSchema>;

// ── Controllers ───────────────────────────────────────────────────

@ReqController("/auth", { tag: "Authentication", authentication: false })
class AuthController {
  @PostMapping("/login", { summary: "Login user" })
  async login(
    @Body(LoginSchema) body: ILoginBody,
    @Cookie() cookie: CookieSetter
  ) {
    // const { accessToken, refreshToken } = await AuthService.login(body);
    // cookie.set("refresh_token", refreshToken, { httpOnly: true, secure: true, maxAge: 7 });
    // return { accessToken };
  }

  @PostMapping("/refresh", { authentication: "refresh", summary: "Refresh access token" })
  async refresh(@Req() req: express.Request) {
    // const token = await AuthService.refresh(req);
    // return { accessToken: token };
  }

  @PostMapping("/logout")
  async logout(@Cookie() cookie: CookieSetter) {
    cookie.delete("refresh_token");
    return null;
  }
}

@ReqController("/users", { authentication: "auth", tag: "User Management" })
class UserController {
  @GetMapping("/", { summary: "Get all users with pagination" })
  async getAll(@Query(UserQuerySchema) query: IUserQuery) {
    // return await UserService.findAll(query);
  }

  @GetMapping("/:id", { summary: "Get user by ID" })
  async getById(@Param("id") id: string) {
    // const user = await UserService.findById(id);
    // if (!user) throw new NotFoundException("User not found");
    // return user;
  }

  @PostMapping("/", { authentication: false, summary: "Register new user" })
  @HttpStatus(201)
  async create(@Body(CreateUserSchema) body: ICreateUser) {
    // const exists = await UserService.findByEmail(body.email);
    // if (exists) throw new ConflictException("Email already registered");
    // return await UserService.create(body);
  }

  @PutMapping("/:id", { summary: "Update user" })
  async update(
    @Param("id") id: string,
    @Body(CreateUserSchema.partial()) body: Partial<ICreateUser>
  ) {
    // const user = await UserService.update(id, body);
    // if (!user) throw new NotFoundException("User not found");
    // return user;
  }

  @DeleteMapping("/:id", { summary: "Delete user" })
  async delete(@Param("id") id: string) {
    // const deleted = await UserService.delete(id);
    // if (!deleted) throw new NotFoundException("User not found");
    // return null;
  }
}

// ── App Setup ─────────────────────────────────────────────────────

const app = express();
app.use(express.json());

RouterKit.setup({
  framework: "express",
  app,
  // authMiddleware: verifyAccessToken,
  // refreshMiddleware: verifyRefreshToken,
  swagger: {
    enabled: true,
    path: "/api/docs",
    title: "My API",
    version: "1.0.0",
    sortBy: "path",
    searchByPath: true,
    searchByMethod: true,
    searchByTag: true,
  },
});

// Register multiple controllers at once
RouterKit.register(AuthController, UserController);

app.listen(3000, () => console.log("Server running on port 3000"));
```

### Response Format

**Success:**
```json
{
  "message": "OK",
  "data": { "_id": "...", "firstName": "Dudi" }
}
```

**Error:**
```json
{
  "message": "User not found",
  "data": null
}
```

**Validation Error:**
```json
{
  "message": "Validation failed",
  "data": {
    "errors": [
      { "field": "age", "message": "Expected number, received string" },
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}
```

---

## License

MIT
