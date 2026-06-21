# INFERA

## 1. Application Name and Type

### Name

**INFERA**

### Tagline

**Organize Knowledge. Capture Ideas. Build Understanding.**

### Type

Knowledge Management and Research Workspace Web Application

### Category

Productivity Software / Personal Knowledge Management (PKM) Platform

### Platform

Web Application

### Architecture

Spring Boot MVC Monolithic Architecture

---

# 2. Description

INFERA is a modern knowledge management platform that allows users to capture, organize, search, and manage information within customizable workspaces.

The application is designed for students, developers, researchers, content creators, entrepreneurs, and professionals who need a centralized environment to store notes, manage projects, organize resources, and track learning progress.

Unlike traditional note-taking applications, INFERA focuses on structured knowledge organization through Workspaces, Notes, Tags, Collections, and Smart Search.

The goal is to provide users with a digital knowledge vault where information can be easily stored, categorized, retrieved, and reused.

---

# 3. Target Users

## Primary Users

### Students

* Store lecture notes
* Organize study material
* Create research repositories
* Track assignments

### Software Developers

* Store programming notes
* Save code snippets
* Organize technical documentation
* Manage learning roadmaps

### Researchers

* Store findings
* Manage references
* Organize projects

### Content Creators

* Store content ideas
* Organize drafts
* Save references

### Entrepreneurs

* Organize business ideas
* Store planning documents
* Manage project information

---

# 4. Application Flow and Style

## Design Style

### Theme

Modern Minimalistic SaaS

### Color Scheme

Primary:

* Dark Navy
* Deep Blue

Secondary:

* White
* Light Gray

Accent:

* Emerald
* Purple

### UI Philosophy

The application should feel like a professional SaaS platform similar to:

* Notion
* Linear
* Obsidian
* ClickUp
* Jira

---

# User Flow

## Authentication

Landing Page

↓

Register

↓

Login

↓

Dashboard

---

## Dashboard

Dashboard

↓

Select Workspace

↓

View Notes

↓

Create/Edit Notes

↓

Search Notes

↓

Manage Resources

---

# Navigation Structure

Dashboard

├── Workspaces

├── Notes

├── Resources

├── Search

├── Activity History

├── Profile

└── Settings

---

# 5. Technology Stack

## Backend

* Java 21
* Spring Boot
* Spring MVC
* Spring Security
* Spring Data JPA
* Hibernate

## Frontend

* Thymeleaf
* HTML5
* CSS3
* Bootstrap 5
* JavaScript

## Database

* PostgreSQL

## Build Tool

* Maven

## Version Control

* Git
* GitHub

## Design

* Figma

## Deployment (Future)

* Docker
* Render
* Railway
* AWS

---

# 6. What The Application Should Do

## User Management

Users must be able to:

* Register
* Login
* Logout
* Edit profile
* Change password

---

## Workspace Management

Users can create:

* Java Backend Workspace
* Research Workspace
* Career Workspace
* Music Workspace

Each workspace contains:

* Notes
* Resources
* Activity Logs

---

## Notes Management

Users can:

* Create notes
* Edit notes
* Delete notes
* Archive notes
* Search notes

Each note contains:

* Title
* Content
* Creation Date
* Update Date
* Tags

---

## Resource Management

Users can save:

* Documentation Links
* Articles
* Tutorials
* Videos

Each resource contains:

* Title
* URL
* Description
* Category

---

## Search System

Users should be able to search:

* Note Titles
* Note Content
* Workspace Names
* Resource Names

---

## Dashboard Analytics

Dashboard should display:

* Total Workspaces
* Total Notes
* Total Resources
* Recent Activities

---

## Activity Tracking

System records:

* Note Created
* Note Updated
* Workspace Created
* Resource Added

---

# 7. How The Application Should Be Built

## Phase 1

Project Initialization

* Create Spring Boot Project
* Configure PostgreSQL
* Configure Thymeleaf
* Configure Bootstrap

---

## Phase 2

Authentication System

Implement:

* Registration
* Login
* Password Encryption
* Session Management

Using:

* Spring Security
* BCrypt

---

## Phase 3

Workspace Module

Implement:

* Create Workspace
* Edit Workspace
* Delete Workspace
* View Workspace

---

## Phase 4

Notes Module

Implement:

* Create Note
* Update Note
* Delete Note
* Archive Note

---

## Phase 5

Resource Module

Implement:

* Add Resource
* Edit Resource
* Delete Resource

---

## Phase 6

Search Module

Implement:

* Global Search
* Workspace Search
* Note Search

---

## Phase 7

Dashboard Analytics

Implement:

* Statistics Cards
* Recent Activity Feed

---

## Phase 8

UI Enhancement

Implement:

* Dark Mode
* Responsive Layout
* Improved UX

---

# 8. PostgreSQL Database Design

## Database Count

### Version 1

Use ONE PostgreSQL Database

Database Name:

infera_db

Reason:

A single database is sufficient because the application is a monolithic Spring MVC application.

---

# Tables

## users

Stores user information.

## workspaces

Stores workspace information.

## notes

Stores note content.

## tags

Stores tags.

## note_tags

Many-to-many relationship.

## resources

Stores saved links.

## activities

Stores activity history.

---

Total Tables

7 Tables

---

# 9. MVC Structure

## Models (Entities)

### User

### Workspace

### Note

### Tag

### Resource

### Activity

Total Models:

6

---

## Repositories

### UserRepository

### WorkspaceRepository

### NoteRepository

### TagRepository

### ResourceRepository

### ActivityRepository

Total Repositories:

6

---

## Services

### UserService

Responsibilities:

* Registration
* Authentication logic
* Profile updates

---

### WorkspaceService

Responsibilities:

* Workspace CRUD

---

### NoteService

Responsibilities:

* Note CRUD
* Note Search

---

### TagService

Responsibilities:

* Tag Assignment

---

### ResourceService

Responsibilities:

* Resource Management

---

### ActivityService

Responsibilities:

* Activity Logging

Total Services:

6

---

## Controllers

### AuthController

Routes:

/login

/register

/logout

---

### DashboardController

Routes:

/dashboard

---

### WorkspaceController

Routes:

/workspaces/**

---

### NoteController

Routes:

/notes/**

---

### ResourceController

Routes:

/resources/**

---

### ProfileController

Routes:

/profile/**

Total Controllers:

6

---

# Communication Flow

Controller

↓

Service

↓

Repository

↓

Database

↓

Repository

↓

Service

↓

Controller

↓

Thymeleaf View

---

Example

User clicks "Create Note"

↓

NoteController

↓

NoteService

↓

NoteRepository

↓

PostgreSQL

↓

Success Response

↓

Redirect Dashboard

---

# 10. Versioning Strategy

## Release Name

INFERA v1.0

Codename:

Foundation

---

# Version 1 Features

## Authentication

* Register
* Login
* Logout

---

## Dashboard

* Statistics Cards
* Recent Activities

---

## Workspaces

* Create
* Edit
* Delete
* View

---

## Notes

* Create
* Edit
* Delete
* Search

---

## Resources

* Save Links
* Manage Links

---

## Profile

* Update Profile
* Change Password

---

## Security

* Spring Security
* BCrypt Password Encryption

---

# Features NOT Included in v1.0

These will be future releases:

* Rich Text Editor
* File Uploads
* Team Collaboration
* Notifications
* AI Note Summaries
* Markdown Editor
* REST API
* Mobile Application
* Real-Time Updates
* Workspace Sharing

---

# Recruiter Value

This project demonstrates:

* Spring Boot
* Spring MVC
* Thymeleaf
* Spring Security
* PostgreSQL
* Hibernate
* JPA
* MVC Architecture
* Authentication
* Search Functionality
* Dashboard Design
* Service Layer Architecture
* Repository Pattern
* Database Design
* UI/UX Planning with Figma

The project should be built and documented as if it were a real SaaS startup product rather than an academic CRUD application.
