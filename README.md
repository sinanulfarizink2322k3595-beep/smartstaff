# SmartStaff

A simple staff management web application built with Node.js and Express.

## Requirements

- [Node.js](https://nodejs.org/) v18 or later

## Getting Started

```bash
# Install dependencies
npm install

# Start the server
npm start
```

Then open your browser at **http://localhost:3000**

## Features

- View all staff members in a directory table
- Add new staff members (name, role, department, email)
- Edit existing staff members
- Delete staff members

## API Endpoints

| Method | Path             | Description               |
|--------|------------------|---------------------------|
| GET    | /api/staff       | List all staff members    |
| GET    | /api/staff/:id   | Get a single staff member |
| POST   | /api/staff       | Create a staff member     |
| PUT    | /api/staff/:id   | Update a staff member     |
| DELETE | /api/staff/:id   | Delete a staff member     |

## Running Tests

```bash
npm test
```
