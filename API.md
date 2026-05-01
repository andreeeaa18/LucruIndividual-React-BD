# API Reference

Base URL: `http://localhost:5000` (dev) — set `CLIENT_ORIGIN` in `.env` for production.

## Authentication

All protected endpoints use an **`httpOnly` cookie** named `token`.  
Set `withCredentials: true` (axios) or `credentials: "include"` (fetch) on **every** request so the browser attaches and receives the cookie automatically.

```js
// axios — set once globally
axios.defaults.withCredentials = true;

// fetch — per request
fetch(url, { credentials: "include", ... });
```

Cookie behaviour:

- Set automatically on `register` and `login`
- Cleared automatically on `logout`
- Expires after **7 days**
- `httpOnly` + `secure` + `sameSite=none` in production; `lax` in dev

---

## Data shapes

### User

```json
{
  "id": "string",
  "name": "string",
  "email": "string",
  "createdAt": "ISO date"
}
```

### Post

```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "image": "string | null",
  "authorId": { "User object" },
  "likeCount": 0,
  "commentCount": 0,
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

### Comment

```json
{
  "id": "string",
  "postId": "string",
  "userId": { "User object" },
  "parentId": "string | null",
  "content": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

> `parentId: null` = top-level comment. `parentId: "<id>"` = reply. The list endpoint returns a flat array — build the reply tree on the frontend by grouping on `parentId`.

---

## Auth — `/api/auth`

### POST `/api/auth/register`

Register a new user. Sets the `token` cookie on success.

**🍪 Cookie:** sets `token`  
**Auth required:** no

**Body:**

```json
{
  "email": "user@example.com",
  "name": "Jane",
  "password": "secret123"
}
```

**Response `201`:**

```json
{
  "user": {
    "id": "...",
    "name": "Jane",
    "email": "user@example.com",
    "createdAt": "..."
  }
}
```

**Errors:** `400` missing fields · `409` email already in use

---

### POST `/api/auth/login`

Login with email and password. Sets the `token` cookie on success.

**🍪 Cookie:** sets `token`  
**Auth required:** no

**Body:**

```json
{
  "email": "user@example.com",
  "password": "secret123"
}
```

**Response `200`:**

```json
{
  "user": {
    "id": "...",
    "name": "Jane",
    "email": "user@example.com",
    "createdAt": "..."
  }
}
```

**Errors:** `400` missing fields · `401` invalid credentials

---

### POST `/api/auth/logout`

Clears the `token` cookie.

**🍪 Cookie:** clears `token`  
**Auth required:** yes (must have a valid cookie)

**Body:** none

**Response `200`:**

```json
{ "message": "Logged out successfully" }
```

**Errors:** `401` not authenticated

---

## Users — `/api/users`

### GET `/api/users/:id`

Get any user's public profile.

**Auth required:** no

**Response `200`:** User object  
**Errors:** `404` user not found

---

### PUT `/api/users/:id`

Update own profile. Only the authenticated user can update their own account.

**🍪 Cookie:** required  
**Auth required:** yes

**Body** (all fields optional):

```json
{
  "name": "New Name",
  "email": "new@example.com",
  "password": "newpassword"
}
```

**Response `200`:** Updated User object  
**Errors:** `401` not authenticated · `403` forbidden (not your account) · `404` user not found

---

### DELETE `/api/users/:id`

Delete own account.

**🍪 Cookie:** required  
**Auth required:** yes

**Body:** none

**Response `200`:**

```json
{ "message": "Account deleted" }
```

**Errors:** `401` not authenticated · `403` forbidden

---

## Posts — `/api/posts`

### GET `/api/posts`

List all posts, newest first. Returns `likeCount` and `commentCount` but not the full likes array.

**Auth required:** no

**Response `200`:** Array of Post objects

---

### GET `/api/posts/:id`

Get a single post by ID.

**Auth required:** no

**Response `200`:** Post object  
**Errors:** `404` post not found

---

### POST `/api/posts`

Create a new post.

**🍪 Cookie:** required  
**Auth required:** yes

**Body:**

```json
{
  "title": "My post",
  "description": "Post content here",
  "image": "https://example.com/img.jpg"
}
```

> `image` is optional.

**Response `201`:** Created Post object  
**Errors:** `400` missing title or description · `401` not authenticated

---

### PUT `/api/posts/:id`

Edit own post. Only the author can update it.

**🍪 Cookie:** required  
**Auth required:** yes

**Body** (all fields optional):

```json
{
  "title": "Updated title",
  "description": "Updated content",
  "image": "https://example.com/new.jpg"
}
```

**Response `200`:** Updated Post object  
**Errors:** `401` not authenticated · `403` forbidden · `404` post not found

---

### DELETE `/api/posts/:id`

Delete own post. Also deletes all comments on that post.

**🍪 Cookie:** required  
**Auth required:** yes

**Body:** none

**Response `200`:**

```json
{ "message": "Post deleted" }
```

**Errors:** `401` not authenticated · `403` forbidden · `404` post not found

---

### POST `/api/posts/:id/like`

Toggle like on a post. Calling it twice undoes the like.

**🍪 Cookie:** required  
**Auth required:** yes

**Body:** none

**Response `200`:**

```json
{ "liked": true, "likeCount": 5 }
```

**Errors:** `401` not authenticated · `404` post not found

---

## Comments — `/api/posts/:postId/comments`

### GET `/api/posts/:postId/comments`

List all comments for a post, sorted oldest first (flat array).

**Auth required:** no

**Response `200`:** Array of Comment objects

> Build the reply tree on the frontend:
>
> ```js
> const topLevel = comments.filter((c) => c.parentId === null);
> const replies = comments.filter((c) => c.parentId !== null);
> ```

---

### POST `/api/posts/:postId/comments`

Add a top-level comment or a reply to an existing comment.

**🍪 Cookie:** required  
**Auth required:** yes

**Body:**

```json
{
  "content": "Great post!",
  "parentId": null
}
```

> Omit `parentId` (or set to `null`) for a top-level comment.  
> Set `parentId` to an existing comment's `id` to post a reply.

**Response `201`:** Created Comment object  
**Errors:** `400` missing content · `401` not authenticated · `404` post not found or parent comment not found

---

### DELETE `/api/posts/:postId/comments/:commentId`

Delete own comment. Also deletes all replies to it.

**🍪 Cookie:** required  
**Auth required:** yes

**Body:** none

**Response `200`:**

```json
{ "message": "Comment deleted" }
```

**Errors:** `401` not authenticated · `403` forbidden · `404` comment not found
