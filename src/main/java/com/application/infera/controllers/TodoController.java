package com.application.infera.controllers;

import com.application.infera.models.TodoItem;
import com.application.infera.models.User;
import com.application.infera.services.CurrentUserService;
import com.application.infera.services.TodoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Dashboard "Today's focus" to-do list.
 *   GET    /api/todos        today's list + the server's next midnight + the daily limit
 *   POST   /api/todos        {text}  → 201 with the new task
 *   PATCH  /api/todos/{id}   {done}  → the updated task
 *   DELETE /api/todos/{id}           → 204
 * Everything is scoped to the logged-in user. Errors are status codes only:
 * 400 bad text, 409 daily limit reached, 404 not yours / not today's, 401 not logged in.
 */
@RestController
@RequestMapping("/api/todos")
@RequiredArgsConstructor
public class TodoController {

    private final TodoService todoService;
    private final CurrentUserService currentUserService;

    public record TodoDto(Long id, String text, boolean done) {}
    public record TodoListDto(List<TodoDto> items, long expiresAt, int max) {}
    public record TodoCreateRequest(String text) {}
    public record TodoDoneRequest(Boolean done) {}

    private static TodoDto toDto(TodoItem item) {
        return new TodoDto(item.getId(), item.getText(), item.isDone());
    }

    @GetMapping
    public ResponseEntity<TodoListDto> list(@AuthenticationPrincipal Object principal) {
        User user = currentUserService.resolve(principal);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        List<TodoDto> items = todoService.getToday(user).stream().map(TodoController::toDto).toList();
        return ResponseEntity.ok(new TodoListDto(items, todoService.expiresAtMillis(), TodoService.MAX_PER_DAY));
    }

    @PostMapping
    public ResponseEntity<TodoDto> add(@AuthenticationPrincipal Object principal,
                                       @RequestBody TodoCreateRequest body) {
        User user = currentUserService.resolve(principal);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        TodoItem created = todoService.add(user, body.text());
        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(created));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<TodoDto> setDone(@AuthenticationPrincipal Object principal,
                                           @PathVariable Long id,
                                           @RequestBody TodoDoneRequest body) {
        User user = currentUserService.resolve(principal);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        if (body.done() == null) return ResponseEntity.badRequest().build();

        return ResponseEntity.ok(toDto(todoService.setDone(user, id, body.done())));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal Object principal,
                                       @PathVariable Long id) {
        User user = currentUserService.resolve(principal);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        todoService.delete(user, id);
        return ResponseEntity.noContent().build();
    }
}