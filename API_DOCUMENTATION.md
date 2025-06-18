# API Documentation

This document provides details about the API endpoints for the News API application.

## Base URL

The base URL for all API endpoints is:
`http://localhost:3000/api`

## Authentication

All endpoints, except for `/auth/signup` and `/auth/login`, are protected and require a JSON Web Token (JWT) to be passed in the `Authorization` header of the request.

**Header Format:**
`Authorization: Bearer <your_jwt_token>`

---

## Authentication Endpoints

These endpoints are used for user registration and login.

### 1. User Signup

Creates a new user account.

*   **Endpoint:** `POST /auth/signup`
*   **Method:** `POST`
*   **Request Body:**

    ```json
    {
      "email": "user@example.com",
      "password": "yourpassword"
    }
    ```

*   **Success Response (201 Created):**

    ```json
    {
      "message": "User created successfully"
    }
    ```

*   **Error Response (400 Bad Request):**

    If the email is already registered.
    ```json
    {
      "error": "Email already in use"
    }
    ```

### 2. User Login

Authenticates a user and provides a JWT for accessing protected endpoints.

*   **Endpoint:** `POST /auth/login`
*   **Method:** `POST`
*   **Request Body:**

    ```json
    {
      "email": "user@example.com",
      "password": "yourpassword"
    }
    ```

*   **Success Response (200 OK):**

    ```json
    {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
    ```

*   **Error Response (401 Unauthorized):**

    If the credentials are not valid.
    ```json
    {
      "error": "Invalid credentials"
    }
    ```

---

## News Sources Endpoints

These endpoints manage the news sources for an authenticated user. Each user has their own unique list of sources.

### 1. Get News Sources

Retrieves the list of news sources for the authenticated user.

*   **Endpoint:** `GET /sources`
*   **Method:** `GET`
*   **Headers:**
    *   `Authorization: Bearer <your_jwt_token>`
*   **Success Response (200 OK):**

    Returns an array of sources. If the user has not added any sources, an empty array is returned.

    ```json
    {
      "sources": ["cnn", "bbc-news", "the-verge"]
    }
    ```
    or
    ```json
    {
        "sources": []
    }
    ```

### 2. Create / Update News Sources

Creates a new list of sources or updates an existing one for the authenticated user. This operation will replace the entire list of sources with the new one provided.

*   **Endpoint:** `PUT /sources`
*   **Method:** `PUT`
*   **Headers:**
    *   `Authorization: Bearer <your_jwt_token>`
*   **Request Body:**

    The body should contain an object with a `sources` key, which is an array of strings.

    ```json
    {
      "sources": ["cnn", "bbc-news", "fox-news"]
    }
    ```

*   **Success Response (200 OK):**

    Returns a confirmation message and the updated list of sources.

    ```json
    {
      "message": "Sources updated successfully",
      "sources": ["cnn", "bbc-news", "fox-news"]
    }
    ```

*   **Error Response (400 Bad Request):**

    If the request body is not in the correct format.

    ```json
    {
      "error": "Sources must be an array of strings."
    }
    ``` 