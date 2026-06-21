# Contributing to INFERA

First off, thank you for considering contributing to INFERA.

INFERA is a modern knowledge management platform built using Spring Boot, Spring MVC, Thymeleaf, PostgreSQL, and Bootstrap. Contributions of all sizes are welcome, from fixing documentation issues to implementing new features.

By participating in this project, you agree to follow the project's Code of Conduct.

---

# Table of Contents

* Getting Started
* Development Environment
* Project Architecture
* Branching Strategy
* Commit Message Guidelines
* Pull Request Process
* Coding Standards
* Database Guidelines
* Testing Guidelines
* Documentation Standards
* Feature Development Workflow

---

# Getting Started

## Fork the Repository

Create your own fork of the project.

```bash
git fork
```

or use GitHub's Fork button.

---

## Clone Your Fork

```bash
git clone https://github.com/your-username/infera.git
```

Navigate into the project directory:

```bash
cd infera
```

---

## Create a Branch

Never work directly on the main branch.

Create a feature branch:

```bash
git checkout -b feature/workspace-management
```

Examples:

```text
feature/note-search
feature/resource-module
feature/user-profile

bugfix/login-validation
bugfix/workspace-loading

docs/readme-update
docs/database-diagram
```

---

# Development Environment

## Required Software

* Java 21+
* Maven 3.9+
* PostgreSQL 16+
* Git
* IntelliJ IDEA (recommended)

---

## Configure PostgreSQL

Create a database:

```sql
CREATE DATABASE infera_db;
```

Update your application configuration:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/infera_db
spring.datasource.username=postgres
spring.datasource.password=your_password

spring.jpa.hibernate.ddl-auto=update
```

---

# Project Architecture

INFERA follows the MVC architecture.

```text
Controller
    ↓
Service
    ↓
Repository
    ↓
PostgreSQL
```

Contributors should respect this architecture.

Business logic must not be placed inside controllers.

Database access must not occur directly inside controllers.

---

# Package Structure

```text
com.infera

├── controller
├── service
│   └── impl
├── repository
├── model
├── security
├── config
├── dto
├── exception
└── util
```

---

# Layer Responsibilities

## Controllers

Responsibilities:

* Handle HTTP requests
* Validate request inputs
* Return Thymeleaf views
* Delegate work to services

Controllers should remain thin.

Bad:

```java
public String saveNote() {
    // business logic here
}
```

Good:

```java
public String saveNote() {
    noteService.createNote();
}
```

---

## Services

Responsibilities:

* Business logic
* Validation rules
* Data transformation
* Application workflows

Services should contain the majority of application logic.

---

## Repositories

Responsibilities:

* Database operations
* Entity retrieval
* Entity persistence

Repositories should not contain business logic.

---

## Models

Responsibilities:

* Database entities
* JPA mappings
* Relationships

Models should remain focused on data representation.

---

# Branching Strategy

The project follows a simplified Git Flow model.

## Main Branch

```text
main
```

Contains production-ready code.

---

## Feature Branches

```text
feature/*
```

Examples:

```text
feature/dashboard
feature/note-search
feature/workspace-management
```

---

## Bug Fix Branches

```text
bugfix/*
```

Examples:

```text
bugfix/login-error
bugfix/dashboard-loading
```

---

## Documentation Branches

```text
docs/*
```

Examples:

```text
docs/update-readme
docs/add-architecture-guide
```

---

# Commit Message Guidelines

Use conventional commit messages.

## Feature

```text
feat: add workspace creation functionality
```

## Bug Fix

```text
fix: resolve login validation issue
```

## Documentation

```text
docs: update installation instructions
```

## Refactor

```text
refactor: simplify note service logic
```

## Test

```text
test: add note service unit tests
```

---

# Pull Request Process

## Before Opening a Pull Request

Ensure:

* Project builds successfully
* No compilation errors
* Code follows project standards
* Documentation updated where necessary

---

## Pull Request Template

Provide:

### Description

What does this change do?

### Motivation

Why was this change necessary?

### Testing

How was it tested?

### Screenshots

Include screenshots for UI changes.

---

# Coding Standards

## Java Naming

### Classes

```java
UserService
WorkspaceController
NoteRepository
```

### Variables

```java
workspaceName
userProfile
activityHistory
```

### Constants

```java
MAX_NOTE_LENGTH
DEFAULT_PAGE_SIZE
```

---

# Spring Boot Standards

## Constructor Injection

Preferred:

```java
private final NoteService noteService;

public NoteController(NoteService noteService) {
    this.noteService = noteService;
}
```

Avoid field injection whenever possible.

---

## Service Annotations

```java
@Service
```

---

## Repository Annotations

```java
@Repository
```

---

## Controller Annotations

```java
@Controller
```

Use:

```java
@RestController
```

only for future API modules.

---

# Database Guidelines

PostgreSQL is the primary database.

Contributors should:

* Use JPA relationships properly
* Avoid unnecessary queries
* Prevent N+1 query issues
* Follow normalization principles

---

## Entity Relationships

Examples:

```text
User
 └── Workspace

Workspace
 └── Note

Note
 └── Tag
```

Maintain consistency when adding new entities.

---

# Testing Guidelines

Contributors should add tests for:

* Service logic
* Repository operations
* Security-sensitive functionality

Recommended:

```text
JUnit 5
Mockito
Spring Boot Test
```

---

# Documentation Standards

When adding features:

Update:

* README.md
* CHANGELOG.md
* ROADMAP.md (if applicable)

Documentation is considered part of the contribution.

---

# Feature Development Workflow

## Step 1

Create an issue.

---

## Step 2

Discuss implementation.

---

## Step 3

Create a feature branch.

---

## Step 4

Implement the feature.

---

## Step 5

Test thoroughly.

---

## Step 6

Submit a pull request.

---

# Areas Where Contributions Are Welcome

## Backend

* Spring Boot features
* PostgreSQL optimization
* Security improvements
* Search functionality

---

## Frontend

* Thymeleaf templates
* Bootstrap UI improvements
* Accessibility enhancements
* Responsive design improvements

---

## Documentation

* Architecture diagrams
* Setup guides
* Tutorials
* Examples

---

# Recognition

All contributors who make meaningful contributions may be recognized in future project releases and contributor acknowledgements.

Thank you for helping improve INFERA.

Together, we can build a professional, scalable, and maintainable knowledge management platform.
